#!/usr/bin/env python3
"""
generate_glint_dict.py
======================
Generates the precomputed multiscale 1D marginal distribution dictionary texture
for real-time physically based glint rendering, following Chermain et al. 2020:
"Procedural Physically based BRDF for Real-Time Rendering of Glints"
(Pacific Graphics 2020 / Computer Graphics Forum).

Texture Layout:
- Total size: 1024 x 64 pixels, 8-bit RGB PNG.
- 16 LOD levels (0 to 15), each 64 x 64 pixels tiled horizontally.
- Each 64x64 block contains:
    - 64 horizontal columns = 64 RGB triplets = 192 independent 1D distributions.
    - 64 vertical rows = discretized slope coordinate u in [-u_max, u_max].
    - RGB channels = 3 independent 1D marginal distributions per pixel.
- Quantization:
    - Encoded with square-root curve: byte = round(255 * sqrt(P / P_max))
    - Decoded in GLSL as: P = (texel * texel) * P_max
    - P_max = 25.0
    - Guarantees high dynamic range and < 0.5% quantization error.
"""

import os
import math
import numpy as np
from PIL import Image

def generate_dictionary(
    nlevels: int = 16,
    num_triplets: int = 64,
    distreso: int = 64,
    alpha_dict: float = 0.5,
    std_dev_lobe: float = 0.025,
    p_max: float = 25.0,
    seed: int = 42
) -> np.ndarray:
    rng = np.random.RandomState(seed)
    
    total_distributions = num_triplets * 3 # 192 distributions
    u_max = 3.0 * alpha_dict # covering [-1.5, 1.5]
    u = np.linspace(-u_max, u_max, distreso, endpoint=True)
    du = u[1] - u[0]
    
    # Store distributions across all levels: shape (nlevels, total_distributions, distreso)
    levels = np.zeros((nlevels, total_distributions, distreso), dtype=np.float32)
    
    # --- Level 0: Fine micro-scale with discrete sharp Gaussian lobes ---
    # At level 0, each distribution is a sparse sum of 1 to 3 microfacet lobes.
    # Microfacet orientations are drawn from the macro Beckmann slope distribution N(0, alpha_dict^2 / 2).
    std_slope = alpha_dict / math.sqrt(2.0)
    
    for d in range(total_distributions):
        # 1 to 3 lobes per distribution at level 0
        num_lobes = rng.randint(1, 4)
        lobe_centers = rng.normal(0.0, std_slope, size=num_lobes)
        # Clip to [-u_max + 2*std_dev_lobe, u_max - 2*std_dev_lobe]
        lobe_centers = np.clip(lobe_centers, -u_max + 2.0 * std_dev_lobe, u_max - 2.0 * std_dev_lobe)
        
        # Accumulate Gaussian lobes
        dist = np.zeros(distreso, dtype=np.float64)
        for center in lobe_centers:
            # 1D Gaussian lobe: (1 / (sqrt(2*pi) * sigma)) * exp(-(u - mu)^2 / (2*sigma^2))
            diff = u - center
            lobe = (1.0 / (math.sqrt(2.0 * math.pi) * std_dev_lobe)) * np.exp(-0.5 * (diff / std_dev_lobe) ** 2)
            dist += lobe
            
        dist /= num_lobes
        # Normalize integral to 1.0: sum(dist) * du == 1.0
        integral = np.sum(dist) * du
        if integral > 1e-6:
            dist /= integral
        levels[0, d] = dist.astype(np.float32)
        
    # --- Levels 1 to nlevels-1: Hierarchical aggregation (Central Limit Theorem) ---
    # As the footprint expands, parent distributions average child distributions,
    # converging naturally to the smooth 1D Beckmann Gaussian slope distribution.
    # Theoretical target Gaussian: (1 / (sqrt(pi) * alpha_dict)) * exp(-u^2 / alpha_dict^2)
    target_gaussian = (1.0 / (math.sqrt(math.pi) * alpha_dict)) * np.exp(-(u / alpha_dict) ** 2)
    target_gaussian /= (np.sum(target_gaussian) * du)
    
    for lvl in range(1, nlevels):
        blend_to_limit = min(1.0, (lvl / float(nlevels - 1)) ** 1.5)
        # Permute and average pairs of distributions from the previous level
        perm = rng.permutation(total_distributions)
        for d in range(total_distributions):
            d_pair = perm[d]
            # Average of two distributions
            avg_dist = 0.5 * (levels[lvl - 1, d] + levels[lvl - 1, d_pair])
            # Blend towards the theoretical target Gaussian as level approaches max LOD
            dist = (1.0 - blend_to_limit * 0.7) * avg_dist + (blend_to_limit * 0.7) * target_gaussian
            # Strict normalization preservation: integral == 1.0
            integral = np.sum(dist) * du
            if integral > 1e-6:
                dist /= integral
            levels[lvl, d] = dist.astype(np.float32)
            
    # At the top level (nlevels - 1), ensure pure smooth Gaussian convergence
    levels[nlevels - 1, :] = target_gaussian.astype(np.float32)
    
    # --- Pack into a 2D Texture Atlas (1024 x 64 pixels, RGB) ---
    # Width = nlevels * num_triplets = 16 * 64 = 1024
    # Height = distreso = 64
    atlas = np.zeros((distreso, nlevels * num_triplets, 3), dtype=np.uint8)
    
    for lvl in range(nlevels):
        x_offset = lvl * num_triplets
        for t in range(num_triplets):
            d_r = t * 3 + 0
            d_g = t * 3 + 1
            d_b = t * 3 + 2
            
            p_r = levels[lvl, d_r]
            p_g = levels[lvl, d_g]
            p_b = levels[lvl, d_b]
            
            # Sqrt encoding: byte = round(255 * sqrt(P / P_max))
            # u=0 is at bottom (row distreso - 1 - r) or top (row r)
            # Texture V=0 at bottom, V=1 at top.
            for row in range(distreso):
                vr = math.sqrt(max(0.0, min(1.0, p_r[row] / p_max))) * 255.0
                vg = math.sqrt(max(0.0, min(1.0, p_g[row] / p_max))) * 255.0
                vb = math.sqrt(max(0.0, min(1.0, p_b[row] / p_max))) * 255.0
                
                # row 0 is u = -u_max, row distreso-1 is u = +u_max
                atlas[row, x_offset + t, 0] = int(round(vr))
                atlas[row, x_offset + t, 1] = int(round(vg))
                atlas[row, x_offset + t, 2] = int(round(vb))
                
    return atlas

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "..", "engine", "textures")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "glint_dict.png")
    
    print(f"Generating Chermain et al. 2020 Glint Dictionary...")
    atlas = generate_dictionary(
        nlevels=16,
        num_triplets=64,
        distreso=64,
        alpha_dict=0.5,
        std_dev_lobe=0.025,
        p_max=25.0
    )
    
    img = Image.fromarray(atlas, mode="RGB")
    img.save(output_path, format="PNG", optimize=True)
    size_kb = os.path.getsize(output_path) / 1024.0
    print(f"Successfully saved glint dictionary texture to {output_path} ({size_kb:.1f} KB, dimensions: {atlas.shape[1]}x{atlas.shape[0]})")

if __name__ == "__main__":
    main()

use std::process::Command;

fn main() {
    let out_dir = std::env::var("OUT_DIR").expect("OUT_DIR not set");

    let cflags_output = Command::new("pkg-config")
        .args(&["--cflags", "dbus-1"])
        .output()
        .expect("pkg-config dbus-1 --cflags failed");
    let cflags = String::from_utf8(cflags_output.stdout).unwrap();

    let mut cc_cmd = Command::new("cc");
    cc_cmd.args(&[
        "-c",
        "src/dbus_server.c",
        "-o",
        &format!("{}/dbus_server.o", out_dir),
        "-fPIC",
        "-O2",
    ]);
    for flag in cflags.split_whitespace() {
        cc_cmd.arg(flag);
    }

    let status = cc_cmd.status().expect("Failed to compile dbus_server.c");
    assert!(status.success(), "Compiling dbus_server.c failed");

    let ar_status = Command::new("ar")
        .args(&[
            "crs",
            &format!("{}/libdbus_server.a", out_dir),
            &format!("{}/dbus_server.o", out_dir),
        ])
        .status()
        .expect("Failed to create archive libdbus_server.a");
    assert!(ar_status.success(), "Creating libdbus_server.a failed");

    println!("cargo:rustc-link-search=native={}", out_dir);
    println!("cargo:rustc-link-lib=static=dbus_server");
    println!("cargo:rustc-link-lib=dbus-1");
    println!("cargo:rerun-if-changed=src/dbus_server.c");
    println!("cargo:rerun-if-changed=src/dbus_server.h");
}

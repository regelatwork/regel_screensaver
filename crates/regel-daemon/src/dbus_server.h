#ifndef REGEL_DBUS_SERVER_H
#define REGEL_DBUS_SERVER_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

int regel_dbus_init(void);
void regel_dbus_emit_spectrum(double sub_bass, double bass, double mids, double treble, double rms, int transient);
void regel_dbus_emit_spectrum_ex(
    double sub_bass,
    double bass,
    double mids,
    double treble,
    double rms,
    int transient,
    double bpm,
    int beat,
    int downbeat,
    double beat_phase,
    int is_vocal,
    double vocal_energy
);
void regel_dbus_emit_beat(uint64_t timestamp_us, double bpm, uint32_t beat_index, int is_downbeat);
void regel_dbus_process_messages(void);
int regel_dbus_check_source_change(char *out_source, size_t max_len);
int regel_dbus_check_gain_change(double *out_gain);
int regel_dbus_check_auto_gain_change(int *out_auto_gain);
double regel_dbus_get_gain(void);

#ifdef __cplusplus
}
#endif

#endif /* REGEL_DBUS_SERVER_H */

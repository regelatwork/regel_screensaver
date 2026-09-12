#ifndef REGEL_DBUS_SERVER_H
#define REGEL_DBUS_SERVER_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

int regel_dbus_init(void);
void regel_dbus_emit_spectrum(double sub_bass, double bass, double mids, double treble, double rms, int transient);
void regel_dbus_process_messages(void);
int regel_dbus_check_source_change(char *out_source, size_t max_len);
int regel_dbus_check_gain_change(double *out_gain);
double regel_dbus_get_gain(void);

#ifdef __cplusplus
}
#endif

#endif /* REGEL_DBUS_SERVER_H */

#include "dbus_server.h"
#include <dbus/dbus.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static DBusConnection *bus_conn = NULL;

static double current_sub_bass = 0.05;
static double current_bass = 0.08;
static double current_mids = 0.05;
static double current_treble = 0.05;
static double current_rms = 0.05;
static dbus_bool_t current_transient = FALSE;
static char current_source[32] = "monitor";
static double current_gain = 3.5;
static int source_change_requested = 0;
static int gain_change_requested = 0;

static const char *introspection_xml =
    "<!DOCTYPE node PUBLIC \"-//freedesktop//DTD D-BUS Object Introspection 1.0//EN\"\n"
    "\"http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd\">\n"
    "<node>\n"
    "  <interface name=\"org.freedesktop.DBus.Introspectable\">\n"
    "    <method name=\"Introspect\">\n"
    "      <arg name=\"data\" direction=\"out\" type=\"s\"/>\n"
    "    </method>\n"
    "  </interface>\n"
    "  <interface name=\"org.freedesktop.DBus.Properties\">\n"
    "    <method name=\"Get\">\n"
    "      <arg name=\"interface_name\" direction=\"in\" type=\"s\"/>\n"
    "      <arg name=\"property_name\" direction=\"in\" type=\"s\"/>\n"
    "      <arg name=\"value\" direction=\"out\" type=\"v\"/>\n"
    "    </method>\n"
    "    <method name=\"GetAll\">\n"
    "      <arg name=\"interface_name\" direction=\"in\" type=\"s\"/>\n"
    "      <arg name=\"props\" direction=\"out\" type=\"a{sv}\"/>\n"
    "    </method>\n"
    "    <signal name=\"PropertiesChanged\">\n"
    "      <arg name=\"interface_name\" type=\"s\"/>\n"
    "      <arg name=\"changed_properties\" type=\"a{sv}\"/>\n"
    "      <arg name=\"invalidated_properties\" type=\"as\"/>\n"
    "    </signal>\n"
    "  </interface>\n"
    "  <interface name=\"org.regel.Audio\">\n"
    "    <property name=\"sub_bass\" type=\"d\" access=\"read\"/>\n"
    "    <property name=\"bass\" type=\"d\" access=\"read\"/>\n"
    "    <property name=\"mids\" type=\"d\" access=\"read\"/>\n"
    "    <property name=\"treble\" type=\"d\" access=\"read\"/>\n"
    "    <property name=\"rms\" type=\"d\" access=\"read\"/>\n"
    "    <property name=\"transient\" type=\"b\" access=\"read\"/>\n"
    "    <property name=\"source\" type=\"s\" access=\"read\"/>\n"
    "    <property name=\"gain\" type=\"d\" access=\"read\"/>\n"
    "    <method name=\"SetSource\">\n"
    "      <arg name=\"source\" direction=\"in\" type=\"s\"/>\n"
    "    </method>\n"
    "    <method name=\"SetGain\">\n"
    "      <arg name=\"gain\" direction=\"in\" type=\"d\"/>\n"
    "    </method>\n"
    "  </interface>\n"
    "</node>\n";

static void append_dict_entry_double(DBusMessageIter *dict, const char *key, double val) {
    DBusMessageIter entry, var;
    dbus_message_iter_open_container(dict, DBUS_TYPE_DICT_ENTRY, NULL, &entry);
    dbus_message_iter_append_basic(&entry, DBUS_TYPE_STRING, &key);
    dbus_message_iter_open_container(&entry, DBUS_TYPE_VARIANT, "d", &var);
    dbus_message_iter_append_basic(&var, DBUS_TYPE_DOUBLE, &val);
    dbus_message_iter_close_container(&entry, &var);
    dbus_message_iter_close_container(dict, &entry);
}

static void append_dict_entry_bool(DBusMessageIter *dict, const char *key, dbus_bool_t val) {
    DBusMessageIter entry, var;
    dbus_message_iter_open_container(dict, DBUS_TYPE_DICT_ENTRY, NULL, &entry);
    dbus_message_iter_append_basic(&entry, DBUS_TYPE_STRING, &key);
    dbus_message_iter_open_container(&entry, DBUS_TYPE_VARIANT, "b", &var);
    dbus_message_iter_append_basic(&var, DBUS_TYPE_BOOLEAN, &val);
    dbus_message_iter_close_container(&entry, &var);
    dbus_message_iter_close_container(dict, &entry);
}

static void append_dict_entry_string(DBusMessageIter *dict, const char *key, const char *val) {
    DBusMessageIter entry, var;
    dbus_message_iter_open_container(dict, DBUS_TYPE_DICT_ENTRY, NULL, &entry);
    dbus_message_iter_append_basic(&entry, DBUS_TYPE_STRING, &key);
    dbus_message_iter_open_container(&entry, DBUS_TYPE_VARIANT, "s", &var);
    dbus_message_iter_append_basic(&var, DBUS_TYPE_STRING, &val);
    dbus_message_iter_close_container(&entry, &var);
    dbus_message_iter_close_container(dict, &entry);
}

static void build_all_properties_dict(DBusMessageIter *dict) {
    append_dict_entry_double(dict, "sub_bass", current_sub_bass);
    append_dict_entry_double(dict, "bass", current_bass);
    append_dict_entry_double(dict, "mids", current_mids);
    append_dict_entry_double(dict, "treble", current_treble);
    append_dict_entry_double(dict, "rms", current_rms);
    append_dict_entry_bool(dict, "transient", current_transient);
    append_dict_entry_string(dict, "source", current_source);
    append_dict_entry_double(dict, "gain", current_gain);
}

static void handle_message(DBusConnection *conn, DBusMessage *msg) {
    const char *interface = dbus_message_get_interface(msg);
    const char *member = dbus_message_get_member(msg);
    const char *path = dbus_message_get_path(msg);

    if (!path || strcmp(path, "/org/regel/Audio") != 0) {
        return;
    }

    DBusMessage *reply = NULL;

    if (interface && strcmp(interface, "org.freedesktop.DBus.Introspectable") == 0 &&
        member && strcmp(member, "Introspect") == 0) {
        reply = dbus_message_new_method_return(msg);
        DBusMessageIter iter;
        dbus_message_iter_init_append(reply, &iter);
        dbus_message_iter_append_basic(&iter, DBUS_TYPE_STRING, &introspection_xml);
    } else if (interface && strcmp(interface, "org.freedesktop.DBus.Properties") == 0) {
        if (member && strcmp(member, "GetAll") == 0) {
            reply = dbus_message_new_method_return(msg);
            DBusMessageIter iter, dict;
            dbus_message_iter_init_append(reply, &iter);
            dbus_message_iter_open_container(&iter, DBUS_TYPE_ARRAY, "{sv}", &dict);
            build_all_properties_dict(&dict);
            dbus_message_iter_close_container(&iter, &dict);
        } else if (member && strcmp(member, "Get") == 0) {
            DBusMessageIter args;
            if (dbus_message_iter_init(msg, &args) &&
                dbus_message_iter_get_arg_type(&args) == DBUS_TYPE_STRING) {
                const char *prop_iface, *prop_name;
                dbus_message_iter_get_basic(&args, &prop_iface);
                dbus_message_iter_next(&args);
                if (dbus_message_iter_get_arg_type(&args) == DBUS_TYPE_STRING) {
                    dbus_message_iter_get_basic(&args, &prop_name);
                    reply = dbus_message_new_method_return(msg);
                    DBusMessageIter iter, var;
                    dbus_message_iter_init_append(reply, &iter);
                    if (strcmp(prop_name, "bass") == 0) {
                        dbus_message_iter_open_container(&iter, DBUS_TYPE_VARIANT, "d", &var);
                        dbus_message_iter_append_basic(&var, DBUS_TYPE_DOUBLE, &current_bass);
                        dbus_message_iter_close_container(&iter, &var);
                    } else if (strcmp(prop_name, "mids") == 0) {
                        dbus_message_iter_open_container(&iter, DBUS_TYPE_VARIANT, "d", &var);
                        dbus_message_iter_append_basic(&var, DBUS_TYPE_DOUBLE, &current_mids);
                        dbus_message_iter_close_container(&iter, &var);
                    } else if (strcmp(prop_name, "treble") == 0) {
                        dbus_message_iter_open_container(&iter, DBUS_TYPE_VARIANT, "d", &var);
                        dbus_message_iter_append_basic(&var, DBUS_TYPE_DOUBLE, &current_treble);
                        dbus_message_iter_close_container(&iter, &var);
                    } else {
                        dbus_message_iter_open_container(&iter, DBUS_TYPE_VARIANT, "d", &var);
                        dbus_message_iter_append_basic(&var, DBUS_TYPE_DOUBLE, &current_rms);
                        dbus_message_iter_close_container(&iter, &var);
                    }
                }
            }
        }
    } else if (interface && strcmp(interface, "org.regel.Audio") == 0) {
        if (member && strcmp(member, "SetSource") == 0) {
            DBusMessageIter args;
            if (dbus_message_iter_init(msg, &args) &&
                dbus_message_iter_get_arg_type(&args) == DBUS_TYPE_STRING) {
                const char *src;
                dbus_message_iter_get_basic(&args, &src);
                if (src && (strcmp(src, "monitor") == 0 || strcmp(src, "mic") == 0)) {
                    strncpy(current_source, src, sizeof(current_source) - 1);
                    source_change_requested = 1;
                }
            }
            reply = dbus_message_new_method_return(msg);
        } else if (member && strcmp(member, "SetGain") == 0) {
            DBusMessageIter args;
            if (dbus_message_iter_init(msg, &args)) {
                int arg_type = dbus_message_iter_get_arg_type(&args);
                double g = -1.0;
                if (arg_type == DBUS_TYPE_DOUBLE) {
                    dbus_message_iter_get_basic(&args, &g);
                } else if (arg_type == DBUS_TYPE_INT32) {
                    int val;
                    dbus_message_iter_get_basic(&args, &val);
                    g = (double)val;
                }
                if (g >= 0.1 && g <= 20.0) {
                    current_gain = g;
                    gain_change_requested = 1;
                }
            }
            reply = dbus_message_new_method_return(msg);
        }
    } else if (interface && strcmp(interface, "org.freedesktop.DBus.Peer") == 0) {
        if (member && strcmp(member, "Ping") == 0) {
            reply = dbus_message_new_method_return(msg);
        }
    }

    if (reply) {
        dbus_connection_send(conn, reply, NULL);
        dbus_connection_flush(conn);
        dbus_message_unref(reply);
    }
}

int regel_dbus_init(void) {
    DBusError err;
    dbus_error_init(&err);

    bus_conn = dbus_bus_get(DBUS_BUS_SESSION, &err);
    if (!bus_conn) {
        fprintf(stderr, "Failed to connect to D-Bus session bus: %s\n", err.message);
        dbus_error_free(&err);
        return -1;
    }

    int ret = dbus_bus_request_name(
        bus_conn,
        "org.regel.Audio",
        DBUS_NAME_FLAG_REPLACE_EXISTING | DBUS_NAME_FLAG_DO_NOT_QUEUE,
        &err
    );

    if (dbus_error_is_set(&err)) {
        fprintf(stderr, "D-Bus request name error: %s\n", err.message);
        dbus_error_free(&err);
        return -1;
    }

    if (ret != DBUS_REQUEST_NAME_REPLY_PRIMARY_OWNER && ret != DBUS_REQUEST_NAME_REPLY_ALREADY_OWNER) {
        fprintf(stderr, "D-Bus name org.regel.Audio already taken\n");
        return -1;
    }

    return 0;
}

void regel_dbus_emit_spectrum(double sub_bass, double bass, double mids, double treble, double rms, int transient) {
    if (!bus_conn) return;

    current_sub_bass = sub_bass;
    current_bass = bass;
    current_mids = mids;
    current_treble = treble;
    current_rms = rms;
    current_transient = transient ? TRUE : FALSE;

    DBusMessage *sig = dbus_message_new_signal(
        "/org/regel/Audio",
        "org.freedesktop.DBus.Properties",
        "PropertiesChanged"
    );
    if (!sig) return;

    DBusMessageIter iter, dict, empty_arr;
    const char *iface = "org.regel.Audio";
    dbus_message_iter_init_append(sig, &iter);
    dbus_message_iter_append_basic(&iter, DBUS_TYPE_STRING, &iface);

    // changed_properties a{sv}
    dbus_message_iter_open_container(&iter, DBUS_TYPE_ARRAY, "{sv}", &dict);
    append_dict_entry_double(&dict, "sub_bass", sub_bass);
    append_dict_entry_double(&dict, "bass", bass);
    append_dict_entry_double(&dict, "mids", mids);
    append_dict_entry_double(&dict, "treble", treble);
    append_dict_entry_double(&dict, "rms", rms);
    append_dict_entry_bool(&dict, "transient", current_transient);
    dbus_message_iter_close_container(&iter, &dict);

    // invalidated_properties as (element type is 's')
    dbus_message_iter_open_container(&iter, DBUS_TYPE_ARRAY, "s", &empty_arr);
    dbus_message_iter_close_container(&iter, &empty_arr);

    dbus_connection_send(bus_conn, sig, NULL);
    dbus_connection_flush(bus_conn);
    dbus_message_unref(sig);
}

void regel_dbus_process_messages(void) {
    if (!bus_conn) return;

    dbus_connection_read_write(bus_conn, 0);
    DBusMessage *msg;
    while ((msg = dbus_connection_pop_message(bus_conn)) != NULL) {
        handle_message(bus_conn, msg);
        dbus_message_unref(msg);
    }
}

int regel_dbus_check_source_change(char *out_source, size_t max_len) {
    if (source_change_requested) {
        source_change_requested = 0;
        strncpy(out_source, current_source, max_len - 1);
        out_source[max_len - 1] = '\0';
        return 1;
    }
    return 0;
}

int regel_dbus_check_gain_change(double *out_gain) {
    if (gain_change_requested) {
        gain_change_requested = 0;
        *out_gain = current_gain;
        return 1;
    }
    return 0;
}

double regel_dbus_get_gain(void) {
    return current_gain;
}

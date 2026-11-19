import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

// PALITAN ito ng IPv4 address ng laptop na nagre-run ng server.py
const API = "http://192.168.254.105:5000";

const ALERTS = {
  normal: {
    bg: "#DCFCE7",
    icon: "✅",
    title: "NORMAL",
    msg: "Fridge is within the safe 2–8°C range.",
  },
  warning: {
    bg: "#FEF3C7",
    icon: "⚠️",
    title: "WARNING",
    msg: "Temperature is nearing the limit. Please check the fridge.",
  },
  excursion: {
    bg: "#FEE2E2",
    icon: "🚨",
    title: "EXCURSION ALERT",
    msg: "Temperature is outside 2–8°C! Check the fridge now.",
  },
};

const fmt = (ts) =>
  new Date(ts * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

// Rate of change in °C per minute (latest reading vs. reading 1 minute earlier)
function getRate(readings) {
  if (readings.length < 3) return null;
  const last = readings[readings.length - 1];
  const prev = readings[readings.length - 3];
  const minutes = (last.created_at - prev.created_at) / 60;
  if (minutes <= 0) return null;
  return (last.temperature - prev.temperature) / minutes;
}

export default function App() {
  const [readings, setReadings] = useState([]);
  const [error, setError] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API}/readings`);
      setReadings(await res.json());
      setError(false);
    } catch (e) {
      setError(true);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // refresh every 30 sec
    return () => clearInterval(id);
  }, []);

  const latest = readings[readings.length - 1];
  const alert = ALERTS[latest ? latest.status : "normal"];
  const rate = getRate(readings);
  const rateIcon = rate === null ? "" : rate > 0.05 ? "↑" : rate < -0.05 ? "↓" : "→";

  return (
    <ScrollView style={styles.container}>
      {/* 1. Excursion Alert panel (top) */}
      <View style={[styles.alert, { backgroundColor: alert.bg }]}>
        <Text style={styles.alertTitle}>
          {alert.icon} {alert.title}
        </Text>
        <Text style={styles.alertMsg}>{alert.msg}</Text>
      </View>

      {error && (
        <Text style={styles.error}>
          Can't reach the server. Check the IP address and WiFi.
        </Text>
      )}

      {/* 2. Current Fridge Statistics */}
      <View style={styles.box}>
        <Text style={styles.heading}>Current Fridge Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Temperature</Text>
            <Text style={styles.statValue}>
              {latest ? `${latest.temperature.toFixed(1)}°C` : "--"}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Rate of Change</Text>
            <Text style={styles.statValue}>
              {rate === null
                ? "--"
                : `${rateIcon} ${rate > 0 ? "+" : ""}${rate.toFixed(2)}°C/min`}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Readings in the Past Hour (boxed): chart + list */}
      <View style={styles.box}>
        <Text style={styles.heading}>Readings in the Past Hour</Text>
        {readings.length > 0 && (
          <LineChart
            data={{
              labels: readings.map((r, i) =>
                i % 20 === 0 ? fmt(r.created_at) : ""
              ),
              datasets: [{ data: readings.map((r) => r.temperature) }],
            }}
            width={Dimensions.get("window").width - 24 - 28}
            height={240}
            yAxisSuffix="°C"
            withDots={false}
            chartConfig={{
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 1,
              color: (o = 1) => `rgba(37, 99, 235, ${o})`,
              labelColor: () => "#374151",
            }}
            style={{ borderRadius: 12 }}
          />
        )}

        {[...readings].reverse().map((r) => (
          <View key={r.created_at} style={styles.row}>
            <Text style={styles.rowText}>{fmt(r.created_at)}</Text>
            <Text style={styles.rowText}>{r.temperature.toFixed(1)}°C</Text>
            <Text style={styles.rowText}>{r.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", padding: 12, paddingTop: 50 },
  alert: { padding: 16, borderRadius: 12, marginBottom: 12 },
  alertTitle: { fontSize: 22, fontWeight: "bold" },
  alertMsg: { fontSize: 16, marginTop: 4 },
  error: { color: "#B91C1C", marginBottom: 8 },
  box: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  heading: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1 },
  statLabel: { fontSize: 14, color: "#6B7280" },
  statValue: { fontSize: 22, fontWeight: "bold", marginTop: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 10,
    marginTop: 4,
    borderRadius: 8,
  },
  rowText: { fontSize: 14 },
});
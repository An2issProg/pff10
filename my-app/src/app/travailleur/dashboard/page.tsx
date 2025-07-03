"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface ServiceItem { name: string; quantity: number; }
interface Reservation {
  _id: string;
  datetime: string;
  services: ServiceItem[];
  status: string;
  user?: {
    name?: string;
    email?: string;
  };
}

export default function WorkerDashboard() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [shift, setShift] = useState<any | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [servicePrices, setServicePrices] = useState<Record<string, number>>({});

  const getCost = (r: Reservation) => r.services.reduce((sum, s) => sum + (servicePrices[s.name] || 0) * s.quantity, 0);
  const acceptedTotal = useMemo(() => reservations.filter(r => r.status === "accepted").reduce((sum, r) => sum + getCost(r), 0), [reservations, servicePrices]);

  /**
   * Retrieve reservations visible to the worker:
   *  - All pending ones (not yet assigned) so he can accept/reject
   *  - His own accepted ones so he can mark them as done
   */
  const fetchReservations = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch("http://localhost:5001/api/worker/reservations", {
        cache: "no-store", // ensure fresh data

        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch reservations");
      const data = await res.json();
      setReservations(Array.isArray(data.reservations) ? data.reservations : []);
    } catch (err) {
      setError("Impossible de charger les réservations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPrices = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/services");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const map: Record<string, number> = {};
      (data.services || []).forEach((s: any) => { map[s.name] = s.price; });
      setServicePrices(map);
    } catch (_) { /* ignore */ }
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/api/worker/shift/summary", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setShift(data.shift || null);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const openShift = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/api/worker/shift/open", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShift(data.shift);
    } catch (e) { alert("Impossible d'ouvrir la journée"); }
  };

  const closeShift = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5001/api/worker/shift/close", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShift(data.shift);
    } catch (e) { alert("Impossible de fermer la journée"); }
  };

  const updateStatus = async (id: string, status: "accepted" | "rejected" | "done") => {
    try {
      setUpdatingId(id);
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5001/api/worker/reservations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update reservation");
      await fetchReservations();
    } catch (err) {
      setError("Échec de mise à jour de la réservation");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pt-24 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-600">
          Tableau de bord Travailleur
        </h1>

        {/* Shift controls */}
        <div className="mb-6 flex gap-4 items-center">
          {shift?.closedAt ? (
            <span className="text-green-400">Journée clôturée ✅ — Total des coûts : {shift.totalRevenue ?? 0} DT</span>
          ) : shift ? (
            <span className="text-yellow-400">Journée ouverte depuis {new Date(shift.openedAt).toLocaleTimeString()} — Acceptées : {acceptedTotal} DT</span>
          ) : (
            <span className="text-red-400">Aucune journée ouverte</span>
          )}
          <button onClick={openShift} disabled={!!shift && !shift.closedAt} className="px-3 py-1 bg-purple-600 rounded disabled:opacity-40">Ouvrir</button>
          <button onClick={closeShift} disabled={!shift || shift.closedAt} className="px-3 py-1 bg-orange-600 rounded disabled:opacity-40">Fermer</button>
          <button onClick={fetchSummary} className="px-3 py-1 bg-gray-700 rounded">Rafraîchir caisse</button>
        </div>

        {shift && (
          <div className="mb-6 p-4 bg-black/40 rounded-lg border border-white/10">
            <h2 className="text-xl mb-2 font-semibold">Sommaire du jour</h2>
            {summaryLoading ? (
              <p>Chargement...</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-300">
                <li>Total réservations terminées : {shift.totalCount ?? 0}</li>
                <li>Total des coûts : {shift.totalRevenue ?? 0} DT</li>
              </ul>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">{error}</div>
        )}

        <div className="overflow-x-auto bg-black/30 backdrop-blur-lg rounded-2xl border border-white/10 shadow-lg">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-white/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Coût</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {reservations.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-center text-gray-400" colSpan={6}>
                    Aucune réservation trouvée.
                  </td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r._id}>
                    <td className="px-6 py-4 whitespace-nowrap">{r.services.map((s) => s.name).join(', ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{r.user?.name || "--"}</div>
                      <div className="text-sm text-gray-400">{r.user?.email || ""}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(r.datetime).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          r.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : r.status === "accepted"
                            ? "bg-green-500/20 text-green-400"
                            : r.status === "rejected"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {r.status === "pending"
                          ? "En attente"
                          : r.status === "accepted"
                          ? "Acceptée"
                          : r.status === "rejected"
                          ? "Rejetée"
                          : "Terminée"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getCost(r)} DT</td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      {r.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStatus(r._id, "accepted")}
                            disabled={updatingId === r._id}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm disabled:opacity-50"
                          >
                            Accepter
                          </button>
                          <button
                            onClick={() => updateStatus(r._id, "rejected")}
                            disabled={updatingId === r._id}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm disabled:opacity-50"
                          >
                            Refuser
                          </button>
                        </>
                      )}
                      {r.status === "accepted" && (
                        <button
                          onClick={() => updateStatus(r._id, "done")}
                          disabled={updatingId === r._id}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm disabled:opacity-50"
                        >
                          Terminer
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

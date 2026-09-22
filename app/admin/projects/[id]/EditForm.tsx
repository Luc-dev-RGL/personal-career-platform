"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Projet = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
  status: string;
};

export default function EditForm({ projet }: { projet: Projet }) {
  const [formData, setFormData] = useState({
    title: projet.title,
    description: projet.description || "",
    imageUrl: projet.imageUrl || "",
    link: projet.link || "",
    status: projet.status,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/admin/projects/${projet.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setMessage("✅ Projet mis à jour !");
      router.refresh();
    } else {
      const data = await res.json();
      setMessage(data.error || "Erreur");
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Supprimer définitivement ce projet ?")) return;
    setLoading(true);

    const res = await fetch(`/api/admin/projects/${projet.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.push("/admin/projects");
    } else {
      setMessage("Erreur lors de la suppression");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 border rounded-lg shadow-sm">
      <div>
        <label className="block font-medium mb-1">Titre *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Description</label>
        <textarea
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">URL de l'image</label>
        <input
          type="url"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Lien du projet</label>
        <input
          type="url"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Statut</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full p-3 border rounded-lg"
        >
          <option value="draft">Brouillon</option>
          <option value="published">Publié</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          {loading ? "Enregistrement…" : "Sauvegarder"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
        >
          Supprimer
        </button>
      </div>

      {message && (
        <p className={`text-center font-medium ${
          message.startsWith("✅") ? "text-green-600" : "text-red-600"
        }`}>
          {message}
        </p>
      )}
    </form>
  );
}
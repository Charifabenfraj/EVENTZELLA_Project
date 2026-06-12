"use client";

import { fetchModels } from "@/lib/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function DashboardOverview() {
  const [models, setModels] = useState([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    let active = true;

    fetchModels()
      .then((data) => {
        if (!active) return;
        setModels(data.models || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Erreur API");
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const categories = Array.from(new Set(models.map((model) => model.category || "Other"))).sort((a, b) =>
      a.localeCompare(b)
    );
    const categoryCount = categories.length;
    const aiModules = models.filter((model) => String(model.category || "").toLowerCase().includes("ai")).length;

    return {
      total: models.length,
      categories: categoryCount,
      aiModules,
      categoryList: categories,
    };
  }, [models]);

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const modelCategory = model.category || "Other";
      const matchesCategory = activeCategory === "all" || modelCategory === activeCategory;
      const term = query.trim().toLowerCase();

      if (!term) {
        return matchesCategory;
      }

      const haystack = [model.display_name, model.description, model.filename, modelCategory]
        .join(" ")
        .toLowerCase();
      return matchesCategory && haystack.includes(term);
    });
  }, [models, activeCategory, query]);

  return (
    <section>
      <div className="hero-block">
        <p className="eyebrow">Plateforme IA Eventzella</p>
        <h2>Control Center ML + LLM</h2>
        <p>
          Interface opérationnelle pour tester les modèles `.pkl`, piloter les modules IA avancés, et suivre les
          fonctionnalités de prévision, devis intelligent, et copilote de planification.
        </p>

        <div className="quick-actions">
          <a className="ghost-button" href="http://localhost:8000/admin" target="_blank" rel="noreferrer">
            Ouvrir Django Admin
          </a>
          <a className="ghost-button" href="http://localhost:8000/api/models/" target="_blank" rel="noreferrer">
            Voir API Models
          </a>
          <a className="ghost-button" href="http://localhost:8000/api/chat/" target="_blank" rel="noreferrer">
            Tester API Chat
          </a>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <p>Modèles disponibles</p>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <p>Catégories ML</p>
          <strong>{stats.categories}</strong>
        </article>
        <article className="stat-card">
          <p>Modules IA avancés</p>
          <strong>{stats.aiModules}</strong>
        </article>
      </div>

      <section className="guide-grid">
        <article className="guide-card">
          <h3>Etape 1</h3>
          <p>Lancer backend Django et frontend Next.js.</p>
        </article>
        <article className="guide-card">
          <h3>Etape 2</h3>
          <p>Choisir un modèle dans la sidebar et tester via formulaire.</p>
        </article>
        <article className="guide-card">
          <h3>Etape 3</h3>
          <p>Utiliser le bouton flottant LLM pour assistance domaine/générale.</p>
        </article>
      </section>

      <section className="filter-panel">
        <label className="field">
          <span>Recherche modèle</span>
          <input
            type="text"
            value={query}
            placeholder="Nom, catégorie, fichier..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="category-pills">
          <button
            type="button"
            className={activeCategory === "all" ? "pill pill-active" : "pill"}
            onClick={() => setActiveCategory("all")}
          >
            Tout
          </button>
          {stats.categoryList.map((category) => (
            <button
              type="button"
              key={category}
              className={activeCategory === category ? "pill pill-active" : "pill"}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="status-error">{error}</p>}

      {!error && filteredModels.length === 0 && (
        <article className="result-card">
          <h3>Aucun résultat</h3>
          <p>Aucun modèle ne correspond au filtre actuel.</p>
        </article>
      )}

      <div className="model-grid">
        {filteredModels.map((model) => (
          <article className="model-card" key={model.key}>
            <p className="chip">{model.category}</p>
            <h3>{model.display_name}</h3>
            <p>{model.description}</p>
            <p className="model-file">{model.filename}</p>
            <Link className="gold-button" href={`/models/${model.key}`}>
              Tester le modèle
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

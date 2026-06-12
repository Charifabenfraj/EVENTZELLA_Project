"use client";

import LogoMark from "@/components/brand/LogoMark";
import { fetchModels } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [models, setModels] = useState([]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    fetchModels()
      .then((data) => {
        if (!active) return;
        setModels(data.models || []);
      })
      .catch(() => {
        if (!active) return;
        setHasError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const groupedModels = useMemo(() => {
    const groups = {};
    for (const model of models) {
      const category = model.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(model);
    }

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [models]);

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <LogoMark className="h-16 w-16" />
        <div>
          <h1>Eventzella</h1>
          <p>ML Ops Dashboard</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <Link href="/" className={pathname === "/" ? "nav-link nav-link-active" : "nav-link"}>
          Dashboard
        </Link>
        <Link href="/mlops" className={pathname === "/mlops" ? "nav-link nav-link-active" : "nav-link"}>
          MLOps / Deployment
        </Link>
        <Link
          href="/workflows/intelligent-quote"
          className={pathname === "/workflows/intelligent-quote" ? "nav-link nav-link-active" : "nav-link"}
        >
          Workflow Intelligent Quote
        </Link>
        <Link href="/models" className={pathname === "/models" ? "nav-link nav-link-active" : "nav-link"}>
          Modèles Machine Learning
        </Link>


        <a className="nav-link" href="http://localhost:8000/admin" target="_blank" rel="noreferrer">
          Django Admin (BO)
        </a>
        <a className="nav-link" href="http://localhost:8000/api/health/" target="_blank" rel="noreferrer">
          API Health
        </a>

        {groupedModels.map(([category, items]) => (
          <div className="category-block" key={category}>
            <p className="category-title">{category}</p>
            {items.map((model) => {
              const href = `/models/${model.key}`;
              const isActive = pathname === href;
              return (
                <Link
                  href={href}
                  key={model.key}
                  className={isActive ? "nav-link nav-link-active" : "nav-link"}
                >
                  {model.display_name}
                </Link>
              );
            })}
          </div>
        ))}

        {hasError && (
          <p className="status-error">
            API indisponible. Vérifie le backend Django sur le port 8000.
          </p>
        )}
      </nav>
    </aside>
  );
}

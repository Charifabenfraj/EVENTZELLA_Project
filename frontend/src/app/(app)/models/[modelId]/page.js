"use client";

import ModelTestForm from "@/components/ModelTestForm";
import { useParams } from "next/navigation";

export default function ModelPage() {
  const params = useParams();
  const modelId = Array.isArray(params.modelId) ? params.modelId[0] : params.modelId;

  return <ModelTestForm modelId={modelId} />;
}

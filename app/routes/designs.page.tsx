import { Navigate, useParams } from "react-router"
import { designPages } from "./designs"

export default function DesignPageRoute() {
  const { page } = useParams()
  const entry = designPages.find((p) => p.slug === page)

  if (!entry) return <Navigate to={`/designs/${designPages[0].slug}`} replace />

  return <entry.Component />
}

import { Navigate } from "react-router";
import { designPages } from "./designs";

export default function DesignsIndexRedirect() {
  return <Navigate to={`/designs/${designPages[0].slug}`} replace />;
}

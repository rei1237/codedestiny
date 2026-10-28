import React from "react";
import { createRoot } from "react-dom/client";
import AdminContentPage from "../../../app/admin/content/page";
import AdminCmsPage from "../../../app/admin/cms/page";
import "../../../app/admin/admin-yehwa.css";
sessionStorage.setItem("flower_admin_token", "LOCAL_CMS_FIXTURE_ONLY." + "0".repeat(64));
createRoot(document.getElementById("root")!).render(<div className="cd-admin">{location.pathname.startsWith("/admin/content") ? <AdminContentPage /> : <AdminCmsPage />}</div>);

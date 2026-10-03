import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import "./PublicLayout.css";

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <Navbar />
      <main id="main-content" className="public-layout__main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

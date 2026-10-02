import "./Layout.css";

const Layout = ({ children }) => (
  <div className="layout">
    <nav className="layout__nav">
      <span className="layout__logo">Doctair</span>
    </nav>
    <main className="layout__main">{children}</main>
  </div>
);

export default Layout;

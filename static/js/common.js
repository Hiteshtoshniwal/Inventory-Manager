// Renders the top navigation bar on every page.
function initPage(activePage) {
  const nav = document.getElementById("topbar");
  const links = [
    { href: "/dashboard.html", label: "Dashboard", key: "dashboard" },
    { href: "/inventory.html", label: "Inventory", key: "inventory" },
    { href: "/receivables.html", label: "Receivables", key: "receivables" },
  ];

  nav.innerHTML = `
    <div class="brand">Vendor Manager</div>
    <nav>
      ${links.map(l => `<a href="${l.href}" class="${l.key === activePage ? "active" : ""}">${l.label}</a>`).join("")}
    </nav>
  `;
}

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

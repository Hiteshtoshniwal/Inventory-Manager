let currentCategory = new URLSearchParams(window.location.search).get("category") || "";
let currentSearch = "";

(async function () {
  initPage("inventory");

  document.querySelectorAll("#categoryTabs button").forEach(btn => {
    if (btn.dataset.cat === currentCategory) btn.classList.add("active");
    else btn.classList.remove("active");
    btn.addEventListener("click", () => {
      currentCategory = btn.dataset.cat;
      document.querySelectorAll("#categoryTabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadItems();
    });
  });

  document.getElementById("searchInput").addEventListener("input", (e) => {
    currentSearch = e.target.value;
    loadItems();
  });

  document.getElementById("addBtn").addEventListener("click", () => openModal());
  document.getElementById("cancelBtn").addEventListener("click", closeModal);
  document.getElementById("itemForm").addEventListener("submit", saveItem);

  loadItems();
})();

async function loadItems() {
  const params = new URLSearchParams();
  if (currentCategory) params.set("category", currentCategory);
  if (currentSearch) params.set("search", currentSearch);
  const res = await fetch("/api/inventory?" + params.toString());
  const items = await res.json();

  const tbody = document.getElementById("itemsTable");
  const emptyState = document.getElementById("emptyState");

  if (items.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  tbody.innerHTML = items.map(i => `
    <tr>
      <td><b>${escapeHtml(i.name)}</b>${i.notes ? `<div style="color:var(--muted); font-size:0.78rem;">${escapeHtml(i.notes)}</div>` : ""}</td>
      <td>${escapeHtml(i.category_label)}</td>
      <td>${i.quantity} ${escapeHtml(i.unit)}</td>
      <td>${money(i.purchase_price)}</td>
      <td>${money(i.price_per_unit)}</td>
      <td style="color:${i.profit_per_unit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">${money(i.profit_per_unit)}</td>
      <td>${money(i.stock_value)}</td>
      <td>${i.low_stock ? `<span class="badge badge-danger">Low Stock</span>` : `<span class="badge badge-success">OK</span>`}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-secondary btn-sm" onclick='editItem(${JSON.stringify(i)})'>Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteItem(${i.id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

function openModal() {
  document.getElementById("modalTitle").textContent = "Add Item";
  document.getElementById("itemForm").reset();
  document.getElementById("itemId").value = "";
  document.getElementById("fCategory").value = currentCategory || "oils";
  document.getElementById("itemModal").classList.add("open");
}

function editItem(item) {
  document.getElementById("modalTitle").textContent = "Edit Item";
  document.getElementById("itemId").value = item.id;
  document.getElementById("fCategory").value = item.category;
  document.getElementById("fName").value = item.name;
  document.getElementById("fUnit").value = item.unit;
  document.getElementById("fQuantity").value = item.quantity;
  document.getElementById("fPurchasePrice").value = item.purchase_price;
  document.getElementById("fPrice").value = item.price_per_unit;
  document.getElementById("fThreshold").value = item.low_stock_threshold;
  document.getElementById("fNotes").value = item.notes;
  document.getElementById("itemModal").classList.add("open");
}

function closeModal() {
  document.getElementById("itemModal").classList.remove("open");
}

async function saveItem(e) {
  e.preventDefault();
  const id = document.getElementById("itemId").value;
  const payload = {
    category: document.getElementById("fCategory").value,
    name: document.getElementById("fName").value,
    unit: document.getElementById("fUnit").value,
    quantity: parseFloat(document.getElementById("fQuantity").value || 0),
    purchase_price: parseFloat(document.getElementById("fPurchasePrice").value || 0),
    price_per_unit: parseFloat(document.getElementById("fPrice").value || 0),
    low_stock_threshold: parseFloat(document.getElementById("fThreshold").value || 0),
    notes: document.getElementById("fNotes").value,
  };

  const url = id ? `/api/inventory/${id}` : "/api/inventory";
  const method = id ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.ok) {
    closeModal();
    loadItems();
  } else {
    alert(data.error || "Something went wrong");
  }
}

async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;
  await fetch(`/api/inventory/${id}`, { method: "DELETE" });
  loadItems();
}

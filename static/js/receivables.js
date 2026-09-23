let currentStatus = "";
let currentSearch = "";
let allRecords = [];

(async function () {
  initPage("receivables");

  document.querySelectorAll("#statusTabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      currentStatus = btn.dataset.status;
      document.querySelectorAll("#statusTabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadRecords();
    });
  });

  document.getElementById("searchInput").addEventListener("input", (e) => {
    currentSearch = e.target.value;
    loadRecords();
  });

  document.getElementById("addBtn").addEventListener("click", openAddModal);
  document.getElementById("cancelBtn").addEventListener("click", () => closeModal("recModal"));
  document.getElementById("recForm").addEventListener("submit", saveRecord);

  document.getElementById("paymentCancelBtn").addEventListener("click", () => closeModal("paymentModal"));
  document.getElementById("paymentForm").addEventListener("submit", submitPayment);

  loadRecords();
})();

function statusBadge(status) {
  if (status === "paid") return `<span class="badge badge-success">Paid</span>`;
  if (status === "partial") return `<span class="badge badge-warning">Partial</span>`;
  return `<span class="badge badge-danger">Pending</span>`;
}

async function loadRecords() {
  const params = new URLSearchParams();
  if (currentStatus) params.set("status", currentStatus);
  if (currentSearch) params.set("search", currentSearch);
  const res = await fetch("/api/receivables?" + params.toString());
  allRecords = await res.json();

  const tbody = document.getElementById("recTable");
  const emptyState = document.getElementById("emptyState");

  if (allRecords.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  tbody.innerHTML = allRecords.map(r => `
    <tr>
      <td><b>${escapeHtml(r.customer_name)}</b>${r.notes ? `<div style="color:var(--muted); font-size:0.78rem;">${escapeHtml(r.notes)}</div>` : ""}</td>
      <td>${escapeHtml(r.phone || "-")}</td>
      <td>${money(r.total_amount)}</td>
      <td>${money(r.amount_paid)}</td>
      <td><b style="color:${r.balance > 0 ? "var(--danger)" : "var(--success)"}">${money(r.balance)}</b></td>
      <td>${r.due_date || "-"}</td>
      <td>${statusBadge(r.status)}</td>
      <td style="white-space:nowrap;">
        ${r.balance > 0 ? `<button class="btn btn-primary btn-sm" onclick="openPaymentModal(${r.id})">Record Payment</button>` : ""}
        <button class="btn btn-secondary btn-sm" onclick="editRecord(${r.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteRecord(${r.id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Customer Due";
  document.getElementById("recForm").reset();
  document.getElementById("recId").value = "";
  document.getElementById("paidField").style.display = "flex";
  document.getElementById("recModal").classList.add("open");
}

function editRecord(id) {
  const r = allRecords.find(x => x.id === id);
  if (!r) return;
  document.getElementById("modalTitle").textContent = "Edit Customer Due";
  document.getElementById("recId").value = r.id;
  document.getElementById("fName").value = r.customer_name;
  document.getElementById("fPhone").value = r.phone;
  document.getElementById("fTotal").value = r.total_amount;
  document.getElementById("fPaid").value = r.amount_paid;
  document.getElementById("fDueDate").value = r.due_date || "";
  document.getElementById("fNotes").value = r.notes;
  // amount_paid is edited only through payments once the record exists
  document.getElementById("paidField").style.display = "none";
  document.getElementById("recModal").classList.add("open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

async function saveRecord(e) {
  e.preventDefault();
  const id = document.getElementById("recId").value;
  const payload = {
    customer_name: document.getElementById("fName").value,
    phone: document.getElementById("fPhone").value,
    total_amount: parseFloat(document.getElementById("fTotal").value || 0),
    due_date: document.getElementById("fDueDate").value || null,
    notes: document.getElementById("fNotes").value,
  };
  if (!id) {
    payload.amount_paid = parseFloat(document.getElementById("fPaid").value || 0);
  }

  const url = id ? `/api/receivables/${id}` : "/api/receivables";
  const method = id ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.ok) {
    closeModal("recModal");
    loadRecords();
  } else {
    alert(data.error || "Something went wrong");
  }
}

async function deleteRecord(id) {
  if (!confirm("Delete this record?")) return;
  await fetch(`/api/receivables/${id}`, { method: "DELETE" });
  loadRecords();
}

function openPaymentModal(id) {
  const r = allRecords.find(x => x.id === id);
  if (!r) return;
  document.getElementById("paymentRecId").value = id;
  document.getElementById("paymentContext").textContent =
    `${r.customer_name} — balance due: ${money(r.balance)}`;
  document.getElementById("paymentAmount").value = r.balance;
  document.getElementById("paymentAmount").max = r.balance;
  document.getElementById("paymentNote").value = "";
  document.getElementById("paymentModal").classList.add("open");
}

async function submitPayment(e) {
  e.preventDefault();
  const id = document.getElementById("paymentRecId").value;
  const payload = {
    amount: parseFloat(document.getElementById("paymentAmount").value || 0),
    note: document.getElementById("paymentNote").value,
  };
  const res = await fetch(`/api/receivables/${id}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.ok) {
    closeModal("paymentModal");
    loadRecords();
  } else {
    alert(data.error || "Something went wrong");
  }
}

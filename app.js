const { createClient } = supabase;
const sb = createClient(window.MEDAID_SUPABASE_URL, window.MEDAID_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

let currentUser = null;
let customerCache = [];

async function login() {
  const e = document.getElementById("email").value.trim();
  const p = document.getElementById("password").value;
  const err = document.getElementById("loginError");
  err.textContent = "";

  if (!window.MEDAID_SUPABASE_PUBLISHABLE_KEY ||
      window.MEDAID_SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")) {
    err.textContent = "Supabase Publishable Key is missing in config.js.";
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({ email: e, password: p });
  if (error) {
    err.textContent = error.message;
    return;
  }

  currentUser = data.user;
  showApp();
}

async function logout() {
  await sb.auth.signOut();
  location.reload();
}

async function boot() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    showApp();
  } else {
    document.getElementById("login").classList.remove("hidden");
  }
}

function showApp() {
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  render("dashboard");
}

document.querySelectorAll(".nav").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".nav").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    render(btn.dataset.page);
  };
});

function money(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

async function render(page) {
  const titles = {
    dashboard:["Dashboard","Supabase-connected CRM"],
    customers:["Customers","Live customer database"],
    orders:["Orders","Live order database"],
    campaigns:["WhatsApp Campaigns","Campaign workspace"],
    templates:["Templates","Approved-template workspace"],
    followups:["Follow-ups","Follow-up workspace"],
    staff:["Telecallers","Team workspace"],
    reports:["Reports","CRM reports"]
  };

  document.getElementById("pageTitle").textContent = titles[page][0];
  document.getElementById("pageSub").textContent = titles[page][1];

  const pages = {
    dashboard, customers, orders, campaigns,
    templates, followups, staff, reports
  };

  document.getElementById("page").innerHTML = await pages[page]();
}

async function dashboard() {
  const [{ count: customers }, { count: orders }] = await Promise.all([
    sb.from("customers").select("*", { count:"exact", head:true }),
    sb.from("orders").select("*", { count:"exact", head:true })
  ]);

  const { data: orderData } = await sb.from("orders").select("amount");
  const sales = (orderData || []).reduce((a,x) => a + Number(x.amount || 0), 0);

  const { count: optins } = await sb
    .from("customers")
    .select("*", { count:"exact", head:true })
    .eq("whatsapp_opt_in", true);

  return `
    <div class="grid">
      <div class="card"><div class="label">Customers</div><div class="stat">${customers || 0}</div></div>
      <div class="card"><div class="label">WhatsApp Opt-ins</div><div class="stat">${optins || 0}</div></div>
      <div class="card"><div class="label">Orders</div><div class="stat">${orders || 0}</div></div>
      <div class="card"><div class="label">Sales</div><div class="stat">${money(sales)}</div></div>
    </div>
    <div class="card" style="margin-top:18px">
      <h3>CRM database</h3>
      <p class="muted">Customer and order data is stored in Supabase.</p>
    </div>`;
}

async function customers() {
  const { data, error } = await sb
    .from("customers")
    .select("*")
    .order("created_at", { ascending:false });

  if (error) return `<div class="notice">Database error: ${esc(error.message)}</div>`;

  customerCache = data || [];

  return `
    <div class="toolbar">
      <input id="customerSearch" placeholder="Search name, mobile or city..." oninput="filterCustomers(this.value)">
      <button class="primary" onclick="openCustomerForm()">+ Add Customer</button>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Mobile</th>
            <th>City</th>
            <th>WhatsApp</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="customerRows">${customerRows(customerCache)}</tbody>
      </table>
    </div>`;
}

function customerRows(list) {
  if (!list.length) {
    return `<tr><td colspan="6"><div class="empty">No customers found.</div></td></tr>`;
  }

  return list.map(c => `
    <tr>
      <td><b>${esc(c.name)}</b></td>
      <td>${esc(c.phone)}</td>
      <td>${esc(c.city || "-")}</td>
      <td>
        <span class="badge ${c.whatsapp_opt_in ? "green" : "orange"}">
          ${c.whatsapp_opt_in ? "Opt-in" : "No opt-in"}
        </span>
      </td>
      <td>${c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "-"}</td>
      <td>
        <button class="secondary" onclick="editCustomer('${c.id}')">Edit</button>
        <button class="secondary" onclick="viewCustomer('${c.id}')">View</button>
      </td>
    </tr>`).join("");
}

function filterCustomers(q) {
  q = q.toLowerCase();
  const list = customerCache.filter(c =>
    `${c.name} ${c.phone} ${c.city || ""}`.toLowerCase().includes(q)
  );
  document.getElementById("customerRows").innerHTML = customerRows(list);
}

function openCustomerForm(customer = null) {
  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-card">
      <h3>${customer ? "Edit Customer" : "Add Customer"}</h3>

      <div class="formgrid">
        <div class="field">
          <label>Full name</label>
          <input id="cn" value="${esc(customer?.name || "")}">
        </div>

        <div class="field">
          <label>Mobile number</label>
          <input id="cp" maxlength="10" value="${esc(customer?.phone || "")}">
        </div>

        <div class="field">
          <label>City</label>
          <input id="cc" value="${esc(customer?.city || "")}">
        </div>

        <div class="field">
          <label>WhatsApp opt-in source</label>
          <select id="cs">
            <option value="CRM">CRM</option>
            <option value="Website">Website</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Call">Call</option>
          </select>
        </div>
      </div>

      <label style="display:block;margin-top:15px">
        <input id="ci" type="checkbox" ${customer?.whatsapp_opt_in ? "checked" : ""}>
        Customer has opted in for WhatsApp marketing
      </label>

      <div class="modal-actions">
        <button class="secondary" onclick="this.closest('.modal').remove()">Cancel</button>
        <button class="primary" onclick="saveCustomer(this,'${customer?.id || ""}')">
          Save Customer
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

async function saveCustomer(btn, id) {
  const name = document.getElementById("cn").value.trim();
  const phone = document.getElementById("cp").value.trim();
  const city = document.getElementById("cc").value.trim();
  const optin = document.getElementById("ci").checked;
  const source = document.getElementById("cs").value;

  if (!name) return alert("Customer name is required.");
  if (!/^\d{10}$/.test(phone)) return alert("Enter a valid 10-digit mobile number.");
  if (!city) return alert("City is required.");

  const payload = {
    name,
    phone,
    city,
    whatsapp_opt_in: optin,
    opt_in_source: optin ? source : null,
    opt_in_at: optin ? new Date().toISOString() : null,
    opted_out_at: optin ? null : new Date().toISOString()
  };

  let result;

  if (id) {
    result = await sb.from("customers").update(payload).eq("id", id);
  } else {
    result = await sb.from("customers").insert(payload);
  }

  if (result.error) {
    if (result.error.code === "23505") {
      alert("This mobile number already exists in the CRM.");
    } else {
      alert(result.error.message);
    }
    return;
  }

  btn.closest(".modal").remove();
  await render("customers");
}

function editCustomer(id) {
  const customer = customerCache.find(x => x.id === id);
  if (customer) openCustomerForm(customer);
}

async function viewCustomer(id) {
  const customer = customerCache.find(x => x.id === id);
  if (!customer) return;

  const { data: orders } = await sb
    .from("orders")
    .select("order_code,amount,status,ordered_at")
    .eq("customer_id", id)
    .order("ordered_at", { ascending:false });

  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-card">
      <h3>${esc(customer.name)}</h3>

      <p>
        <b>Mobile:</b> ${esc(customer.phone)}<br>
        <b>City:</b> ${esc(customer.city || "-")}<br>
        <b>WhatsApp:</b>
        <span class="badge ${customer.whatsapp_opt_in ? "green" : "orange"}">
          ${customer.whatsapp_opt_in ? "Opt-in" : "No opt-in"}
        </span>
      </p>

      <hr>
      <h4>Order History</h4>

      ${
        orders?.length
        ? `<div class="table-wrap">
            <table class="table">
              <thead><tr><th>Order</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
              ${orders.map(o => `
                <tr>
                  <td>${esc(o.order_code || "-")}</td>
                  <td>${money(o.amount)}</td>
                  <td>${esc(o.status)}</td>
                  <td>${new Date(o.ordered_at).toLocaleDateString("en-IN")}</td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="empty">No orders yet.</div>`
      }

      <div class="modal-actions">
        <button class="secondary" onclick="this.closest('.modal').remove()">Close</button>
        <button class="primary" onclick="this.closest('.modal').remove();editCustomer('${id}')">Edit Customer</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
}

async function orders() {
  const { data, error } = await sb
    .from("orders")
    .select("id,order_code,amount,status,telecaller,ordered_at")
    .order("ordered_at", { ascending:false });

  if (error) return `<div class="notice">${esc(error.message)}</div>`;

  return `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Order</th><th>Amount</th><th>Status</th><th>Telecaller</th><th>Date</th></tr></thead>
        <tbody>
        ${(data || []).map(o => `
          <tr>
            <td>${esc(o.order_code || o.id.slice(0,8))}</td>
            <td>${money(o.amount)}</td>
            <td>${esc(o.status)}</td>
            <td>${esc(o.telecaller || "-")}</td>
            <td>${new Date(o.ordered_at).toLocaleDateString("en-IN")}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

async function campaigns() {
  return `<div class="notice">WhatsApp sending will be connected through the secure Meta Cloud API backend. Only opted-in customers and approved templates will be eligible.</div>
  <div class="card"><h3>Campaign Manager</h3><p class="muted">Customer segmentation foundation is ready.</p></div>`;
}

async function templates() {
  return `<div class="notice">Meta-approved WhatsApp templates will appear here after API integration.</div>`;
}

async function followups() {
  return `<div class="card"><div class="empty">Follow-ups database is ready. Automation will be added next.</div></div>`;
}

async function staff() {
  return `<div class="card"><div class="empty">Telecaller roles and permissions will be added next.</div></div>`;
}

async function reports() {
  const { data } = await sb.from("orders").select("amount");
  const sales = (data || []).reduce((a,x) => a + Number(x.amount || 0), 0);

  return `<div class="grid">
    <div class="card"><div class="label">Sales</div><div class="stat">${money(sales)}</div></div>
    <div class="card"><div class="label">Orders</div><div class="stat">${(data || []).length}</div></div>
  </div>`;
}

boot();
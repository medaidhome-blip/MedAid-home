const state={
 customers:[
  {id:"C001",name:"Rahul Sharma",phone:"9876543210",city:"Indore",orders:4,value:14800,last:"2026-08-15",status:"Active"},
  {id:"C002",name:"Priya Verma",phone:"9123456780",city:"Kota",orders:2,value:6200,last:"2026-08-12",status:"Active"},
  {id:"C003",name:"Amit Jain",phone:"9988776655",city:"Dewas",orders:1,value:2400,last:"2026-08-10",status:"New"}
 ],
 orders:[
  {id:"ORD1001",customer:"Rahul Sharma",amount:4200,status:"Delivered",date:"2026-08-15",caller:"Ayesha"},
  {id:"ORD1002",customer:"Priya Verma",amount:2800,status:"Processing",date:"2026-08-16",caller:"Riya"},
  {id:"ORD1003",customer:"Amit Jain",amount:2400,status:"Confirmed",date:"2026-08-16",caller:"Ayesha"}
 ],
 staff:[
  {name:"Ayesha",phone:"9096144388",orders:1,sales:4200},
  {name:"Riya",phone:"9000000000",orders:1,sales:2800}
 ]
};

function login(){
 const e=document.getElementById("email").value.trim(), p=document.getElementById("password").value;
 if(e==="admin@medaidhome.com" && p==="admin123"){
   localStorage.setItem("medaidLoggedIn","1");
   showApp();
 }else document.getElementById("loginError").textContent="Incorrect email or password.";
}
function logout(){localStorage.removeItem("medaidLoggedIn");location.reload()}
function showApp(){document.getElementById("login").classList.add("hidden");document.getElementById("app").classList.remove("hidden");render("dashboard")}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");render(b.dataset.page)});
function money(n){return "₹"+Number(n).toLocaleString("en-IN")}
function render(page){
 const titles={dashboard:["Dashboard","Overview of your CRM"],customers:["Customers","Manage your customer database"],orders:["Orders","Track every order"],followups:["Follow-ups","Customers requiring action"],staff:["Telecallers","Team performance"],reports:["Reports","Sales and operational reports"]};
 document.getElementById("pageTitle").textContent=titles[page][0];document.getElementById("pageSub").textContent=titles[page][1];
 const el=document.getElementById("page");
 if(page==="dashboard") el.innerHTML=dashboard();
 if(page==="customers") el.innerHTML=customers();
 if(page==="orders") el.innerHTML=orders();
 if(page==="followups") el.innerHTML=followups();
 if(page==="staff") el.innerHTML=staff();
 if(page==="reports") el.innerHTML=reports();
}
function dashboard(){
 const sales=state.orders.reduce((a,b)=>a+b.amount,0);
 return `<div class="grid">
 <div class="card"><div class="label">Total Customers</div><div class="stat">${state.customers.length}</div></div>
 <div class="card"><div class="label">Total Orders</div><div class="stat">${state.orders.length}</div></div>
 <div class="card"><div class="label">Sales</div><div class="stat">${money(sales)}</div></div>
 <div class="card"><div class="label">Pending Orders</div><div class="stat">${state.orders.filter(x=>x.status!=="Delivered").length}</div></div>
 </div>
 <div class="card" style="margin-top:18px"><h3 class="section-title">Quick Actions</h3><div class="quick">
 <button class="primary" onclick="go('customers')">Customers</button><button class="primary" onclick="go('orders')">Orders</button><button class="primary" onclick="go('followups')">Follow-ups</button>
 </div></div>`;
}
function customers(){
 return `<div class="toolbar"><input placeholder="Search customer..." oninput="filterCustomers(this.value)"><button class="primary" onclick="alert('Customer form will be connected to the database in the next stage.')">+ Add Customer</button></div>
 <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Customer</th><th>Phone</th><th>City</th><th>Orders</th><th>Value</th><th>Last Order</th></tr></thead><tbody id="customerRows">${customerRows(state.customers)}</tbody></table></div>`;
}
function customerRows(arr){return arr.map(c=>`<tr><td>${c.id}</td><td><b>${c.name}</b></td><td>${c.phone}</td><td>${c.city}</td><td>${c.orders}</td><td>${money(c.value)}</td><td>${c.last}</td></tr>`).join("")}
function filterCustomers(q){const a=state.customers.filter(c=>(c.name+c.phone+c.city).toLowerCase().includes(q.toLowerCase()));document.getElementById("customerRows").innerHTML=customerRows(a)}
function orders(){
 return `<div class="toolbar"><input placeholder="Search order/customer..." oninput="filterOrders(this.value)"><button class="primary" onclick="alert('Order form will be connected to the database in the next stage.')">+ New Order</button></div>
 <div class="table-wrap"><table class="table"><thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th><th>Telecaller</th></tr></thead><tbody id="orderRows">${orderRows(state.orders)}</tbody></table></div>`;
}
function orderRows(arr){return arr.map(o=>`<tr><td><b>${o.id}</b></td><td>${o.customer}</td><td>${money(o.amount)}</td><td><span class="badge ${o.status==="Delivered"?"green":o.status==="Processing"?"orange":"")">${o.status}</span></td><td>${o.date}</td><td>${o.caller}</td></tr>`).join("")}
function filterOrders(q){const a=state.orders.filter(o=>(o.id+o.customer+o.status+o.caller).toLowerCase().includes(q.toLowerCase()));document.getElementById("orderRows").innerHTML=orderRows(a)}
function followups(){
 return `<div class="card"><h3 class="section-title">Today's Follow-ups</h3><div class="empty">No follow-ups scheduled yet. Database automation will be added in the next stage.</div></div>`;
}
function staff(){
 return `<div class="table-wrap"><table class="table"><thead><tr><th>Telecaller</th><th>Phone</th><th>Orders</th><th>Sales</th></tr></thead><tbody>${state.staff.map(s=>`<tr><td><b>${s.name}</b></td><td>${s.phone}</td><td>${s.orders}</td><td>${money(s.sales)}</td></tr>`).join("")}</tbody></table></div>`;
}
function reports(){
 const sales=state.orders.reduce((a,b)=>a+b.amount,0);
 return `<div class="grid"><div class="card"><div class="label">Total Sales</div><div class="stat">${money(sales)}</div></div><div class="card"><div class="label">Average Order</div><div class="stat">${money(sales/state.orders.length||0)}</div></div><div class="card"><div class="label">Delivered</div><div class="stat">${state.orders.filter(x=>x.status==="Delivered").length}</div></div><div class="card"><div class="label">Conversion</div><div class="stat">—</div></div></div>`;
}
function go(p){document.querySelector(`[data-page="${p}"]`).click()}
if(localStorage.getItem("medaidLoggedIn")==="1")showApp();
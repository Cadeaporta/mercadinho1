let clientes = {};
let produtos = {};
let vendas = [];
let itensTemp = [];

// ---------------- Clientes ----------------
function cadastrarCliente(event) {
  event.preventDefault();
  let nome = document.getElementById("nomeCliente").value.trim().toLowerCase();
  let cpf = document.getElementById("cpfCliente").value.trim();
  let telefone = document.getElementById("telefoneCliente").value.trim();

  if (!nome) { alert("Digite o nome!"); return; }

  firebase.database().ref("clientes/" + nome).set({ cpf, telefone });
  event.target.reset();
}

function carregarClientes() {
  firebase.database().ref("clientes").on("value", snap => {
    clientes = snap.val() || {};
    atualizarListaClientes();
  });
}

function atualizarListaClientes() {
  let lista = document.getElementById("listaClientes");
  lista.innerHTML = "";
  for (let nome in clientes) {
    let c = clientes[nome];
    let li = document.createElement("li");
    li.textContent = `${nome} - CPF: ${c.cpf} - Tel: ${c.telefone}`;

    let btn = document.createElement("button");
    btn.textContent = "❌";
    btn.classList.add("btn-excluir");
    btn.onclick = () => {
      firebase.database().ref("clientes/" + nome).remove();
    };

    li.appendChild(btn);
    lista.appendChild(li);
  }
}

// ---------------- Produtos ----------------
function cadastrarProduto(event) {
  event.preventDefault();
  let codigo = document.getElementById("codigoProduto").value.trim();
  let nome = document.getElementById("nomeProduto").value.trim();
  let preco = parseFloat(document.getElementById("precoProduto").value);
  let qtd = parseInt(document.getElementById("quantidadeProduto").value);

  if (!codigo || !nome || isNaN(preco) || isNaN(qtd)) {
    alert("Preencha todos os campos!");
    return;
  }

  firebase.database().ref("produtos/" + codigo).set({ nome, preco, quantidade: qtd });
  event.target.reset();
}

function carregarProdutos() {
  firebase.database().ref("produtos").on("value", snap => {
    produtos = snap.val() || {};
    atualizarListaProdutos();
  });
}

function atualizarListaProdutos() {
  let lista = document.getElementById("listaProdutos");
  lista.innerHTML = "";
  for (let codigo in produtos) {
    let p = produtos[codigo];
    let li = document.createElement("li");
    li.textContent = `${codigo} - ${p.nome} | R$ ${p.preco.toFixed(2)} | Estoque: ${p.quantidade}`;

    let btn = document.createElement("button");
    btn.textContent = "❌";
    btn.classList.add("btn-excluir");
    btn.onclick = () => {
      firebase.database().ref("produtos/" + codigo).remove();
    };

    li.appendChild(btn);
    lista.appendChild(li);
  }
}

// ---------------- Vendas ----------------
function adicionarItem(event) {
  event.preventDefault();
  let clienteNome = document.getElementById("cpfVenda").value.trim().toLowerCase();
  let codigo = document.getElementById("codigoVenda").value.trim();
  let qtd = parseInt(document.getElementById("qtdVenda").value);

  if (!clienteNome || !codigo || isNaN(qtd)) {
    alert("Preencha todos os campos!");
    return;
  }

  if (!clientes[clienteNome]) {
    alert("Cliente não encontrado!");
    return;
  }

  if (!produtos[codigo] || produtos[codigo].quantidade < qtd) {
    alert("Produto indisponível!");
    return;
  }

  let subtotal = produtos[codigo].preco * qtd;
  itensTemp.push({ codigo, produto: produtos[codigo].nome, quantidade: qtd, subtotal });

  atualizarItensVenda();

  document.getElementById("codigoVenda").value = "";
  document.getElementById("qtdVenda").value = "";
}

function atualizarItensVenda() {
  let lista = document.getElementById("itensVenda");
  lista.innerHTML = "";
  itensTemp.forEach(i => {
    let li = document.createElement("li");
    li.textContent = `${i.produto} - ${i.quantidade}x - R$ ${i.subtotal.toFixed(2)}`;
    lista.appendChild(li);
  });
}

function finalizarVenda() {
  if (itensTemp.length === 0) {
    alert("Nenhum item!");
    return;
  }

  let clienteNome = document.getElementById("cpfVenda").value.trim().toLowerCase();
  if (!clientes[clienteNome]) {
    alert("Cliente não encontrado!");
    return;
  }

  let total = itensTemp.reduce((s, i) => s + i.subtotal, 0);
  let hoje = new Date();
  let dataStr = hoje.toISOString().split("T")[0];

  let novaVenda = { cliente: clienteNome, itens: itensTemp, total, data: dataStr };

  firebase.database().ref("vendas").push(novaVenda);

  itensTemp.forEach(i => {
    let refProd = firebase.database().ref("produtos/" + i.codigo + "/quantidade");
    refProd.transaction(q => (q || 0) - i.quantidade);
  });

  itensTemp = [];
  atualizarItensVenda();
  alert("✅ Venda finalizada!");
}

function carregarVendas() {
  firebase.database().ref("vendas").on("value", snap => {
    vendas = [];
    snap.forEach(child => vendas.push(child.val()));
    atualizarListaVendas();
  });
}

function atualizarListaVendas() {
  let lista = document.getElementById("listaVendas");
  lista.innerHTML = "";
  vendas.forEach(v => {
    let li = document.createElement("li");
    li.textContent = `${v.data} - ${v.cliente} - Total: R$ ${v.total.toFixed(2)}`;
    lista.appendChild(li);
  });
}

// ---------------- Relatórios ----------------
function relatorioPorMes() {
  let mes = document.getElementById("mesFiltro").value;
  let saida = document.getElementById("saidaRelatorios");
  saida.innerHTML = `<h3>Relatório de ${mes}</h3>`;

  let vendasMes = vendas.filter(v => v.data.startsWith(mes));
  if (vendasMes.length === 0) {
    saida.innerHTML += "<p>Nenhuma venda.</p>";
    return;
  }

  vendasMes.forEach((v, idx) => {
    let p = document.createElement("p");
    p.textContent = `${idx+1}. ${v.data} - Cliente: ${v.cliente} - Total: R$ ${v.total.toFixed(2)}`;
    saida.appendChild(p);
  });
}

function exportarMesExcel() {
  let mes = document.getElementById("mesFiltro").value;
  let vendasMes = vendas.filter(v => v.data.startsWith(mes));
  if (vendasMes.length === 0) { alert("Nenhuma venda."); return; }

  let dados = [];
  vendasMes.forEach(v => {
    v.itens.forEach(i => {
      dados.push({ Data: v.data, Cliente: v.cliente, Produto: i.produto, Quantidade: i.quantidade, Subtotal: i.subtotal.toFixed(2), TotalVenda: v.total.toFixed(2) });
    });
  });

  let ws = XLSX.utils.json_to_sheet(dados);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Vendas_${mes}`);
  XLSX.writeFile(wb, `vendas_${mes}.xlsx`);
}

function exportarTodasVendas() {
  let dados = [];
  vendas.forEach(v => {
    v.itens.forEach(i => {
      dados.push({ Data: v.data, Cliente: v.cliente, Produto: i.produto, Quantidade: i.quantidade, Subtotal: i.subtotal.toFixed(2), TotalVenda: v.total.toFixed(2) });
    });
  });

  let ws = XLSX.utils.json_to_sheet(dados);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Todas_Vendas");
  XLSX.writeFile(wb, "todas_vendas.xlsx");
}

function exportarClientes() {
  let dados = [];
  for (let nome in clientes) {
    dados.push({ Nome: nome, CPF: clientes[nome].cpf, Telefone: clientes[nome].telefone });
  }

  let ws = XLSX.utils.json_to_sheet(dados);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");
  XLSX.writeFile(wb, "clientes.xlsx");
}

// ---------------- Navegação ----------------
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(sec => sec.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

window.addEventListener("load", () => {
  document.getElementById("formCliente").addEventListener("submit", cadastrarCliente);
  document.getElementById("formProduto").addEventListener("submit", cadastrarProduto);
  document.getElementById("formVenda").addEventListener("submit", adicionarItem);
  document.getElementById("btnFinalizarVenda").addEventListener("click", finalizarVenda);

  document.getElementById("btnMenuProdutos").addEventListener("click", () => mostrarTela("produtos"));
  document.getElementById("btnMenuClientes").addEventListener("click", () => mostrarTela("clientes"));
  document.getElementById("btnMenuVendas").addEventListener("click", () => mostrarTela("vendas"));
  document.getElementById("btnMenuRelatorios").addEventListener("click", () => mostrarTela("relatorios"));

  document.getElementById("btnRelatorioMes").addEventListener("click", relatorioPorMes);
  document.getElementById("btnExportarMesExcel").addEventListener("click", exportarMesExcel);
  document.getElementById("btnExportarVendasExcel").addEventListener("click", exportarTodasVendas);
  document.getElementById("btnExportarClientesExcel").addEventListener("click", exportarClientes);

  carregarClientes();
  carregarProdutos();
  carregarVendas();

  mostrarTela("produtos");
});

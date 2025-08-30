// Dados em memória (com persistência)
let produtos = {};
let clientes = {};
let vendas = [];
let itensTemp = [];
let cpfVendaAtual = null; // ✅ guarda cliente da venda em andamento

// ---------- Persistência com LocalStorage ----------
function salvarDados() {
  localStorage.setItem("produtos", JSON.stringify(produtos));
  localStorage.setItem("clientes", JSON.stringify(clientes));
  localStorage.setItem("vendas", JSON.stringify(vendas));
}

function carregarDados() {
  produtos = JSON.parse(localStorage.getItem("produtos")) || {};
  clientes = JSON.parse(localStorage.getItem("clientes")) || {};
  vendas = JSON.parse(localStorage.getItem("vendas")) || [];

  atualizarProdutos();
  atualizarClientes();
}

// ---------------- Alternar telas ----------------
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(t => t.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// ---------------- Produtos ----------------
document.getElementById("formProduto").addEventListener("submit", e => {
  e.preventDefault();
  let codigo = document.getElementById("codigoProduto").value.trim();
  let nome = document.getElementById("nomeProduto").value.trim();
  let preco = parseFloat(document.getElementById("precoProduto").value);
  let qtd = parseInt(document.getElementById("qtdProduto").value);

  if (produtos[codigo]) {
    alert("⚠ Já existe um produto com esse código!");
    return;
  }

  produtos[codigo] = { nome, preco, quantidade: qtd };
  atualizarProdutos();
  salvarDados();
  e.target.reset();
});

function atualizarProdutos() {
  let tbody = document.getElementById("listaProdutos");
  tbody.innerHTML = "";
  for (let codigo in produtos) {
    let p = produtos[codigo];
    tbody.innerHTML += `<tr>
      <td>${codigo}</td><td>${p.nome}</td><td>R$ ${p.preco.toFixed(2)}</td><td>${p.quantidade}</td>
    </tr>`;
  }
}

// ---------------- Clientes ----------------
document.getElementById("formCliente").addEventListener("submit", e => {
  e.preventDefault();
  let cpf = document.getElementById("cpfCliente").value.trim().toLowerCase();
  let nome = document.getElementById("nomeCliente").value.trim();
  let telefone = document.getElementById("telCliente").value.trim();

  if (clientes[cpf]) {
    alert("⚠ Já existe um cliente com esse CPF/ID!");
    return;
  }

  clientes[cpf] = { nome, telefone };
  atualizarClientes();
  salvarDados();
  e.target.reset();
});

function atualizarClientes() {
  let tbody = document.getElementById("listaClientes");
  tbody.innerHTML = "";
  for (let cpf in clientes) {
    let c = clientes[cpf];
    tbody.innerHTML += `<tr>
      <td>${cpf}</td><td>${c.nome}</td><td>${c.telefone}</td>
    </tr>`;
  }
}

// ---------------- Vendas ----------------
document.getElementById("formVenda").addEventListener("submit", e => {
  e.preventDefault();
  let cpf = document.getElementById("cpfVenda").value.trim().toLowerCase();
  let codigo = document.getElementById("codigoVenda").value.trim();
  let qtd = parseInt(document.getElementById("qtdVenda").value);

  if (!clientes[cpf]) {
    alert("⚠ Cliente não encontrado!");
    return;
  }
  if (!produtos[codigo]) {
    alert("⚠ Produto não encontrado!");
    return;
  }
  if (qtd > produtos[codigo].quantidade) {
    alert("⚠ Estoque insuficiente!");
    return;
  }

  if (!cpfVendaAtual) {
    cpfVendaAtual = cpf;
  }

  produtos[codigo].quantidade -= qtd;
  itensTemp.push({ produto: produtos[codigo].nome, quantidade: qtd, subtotal: qtd * produtos[codigo].preco });
  atualizarProdutos();
  atualizarItensVenda();
  e.target.reset();
});

function atualizarItensVenda() {
  let ul = document.getElementById("itensVenda");
  ul.innerHTML = "";
  itensTemp.forEach(item => {
    ul.innerHTML += `<li>${item.produto} x${item.quantidade} = R$ ${item.subtotal.toFixed(2)}</li>`;
  });
}

function finalizarVenda() {
  if (itensTemp.length === 0) {
    alert("⚠ Nenhum item na venda!");
    return;
  }
  if (!cpfVendaAtual || !clientes[cpfVendaAtual]) {
    alert("⚠ Cliente não encontrado!");
    return;
  }

  let total = itensTemp.reduce((s, i) => s + i.subtotal, 0);
  vendas.push({ cliente: clientes[cpfVendaAtual].nome, itens: [...itensTemp], total });

  salvarDados(); // ✅ agora só salva aqui

  itensTemp = [];
  cpfVendaAtual = null;
  document.getElementById("itensVenda").innerHTML = "";
  alert(`✅ Venda finalizada! Total R$ ${total.toFixed(2)}`);
}

// ---------------- Relatórios ----------------
function relatorioClientes() {
  let tot = {};
  vendas.forEach(v => {
    tot[v.cliente] = (tot[v.cliente] || 0) + v.total;
  });
  let out = "<h3>Vendas por Cliente</h3><ul>";
  for (let c in tot) out += `<li>${c}: R$ ${tot[c].toFixed(2)}</li>`;
  out += "</ul>";
  document.getElementById("saidaRelatorios").innerHTML = out;
}

function relatorioProdutos() {
  let tot = {};
  vendas.forEach(v => {
    v.itens.forEach(i => {
      tot[i.produto] = (tot[i.produto] || 0) + i.quantidade;
    });
  });
  let out = "<h3>Produtos Mais Vendidos</h3><ul>";
  for (let p in tot) out += `<li>${p}: ${tot[p]} unidades</li>`;
  out += "</ul>";
  document.getElementById("saidaRelatorios").innerHTML = out;
}

// ---------------- Exportar ----------------
function exportarVendasExcel() {
  if (vendas.length === 0) {
    alert("⚠ Não há vendas para exportar!");
    return;
  }

  let dados = [];
  vendas.forEach((v, idx) => {
    v.itens.forEach(item => {
      dados.push({
        Venda: idx + 1,
        Cliente: v.cliente,
        Produto: item.produto,
        Quantidade: item.quantidade,
        Subtotal: item.subtotal.toFixed(2),
        TotalVenda: v.total.toFixed(2)
      });
    });
  });

  let ws = XLSX.utils.json_to_sheet(dados);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vendas");
  XLSX.writeFile(wb, "vendas.xlsx");
}

function exportarVendasPDF() {
  if (vendas.length === 0) {
    alert("⚠ Não há vendas para exportar!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Relatório de Vendas", 14, 20);

  let y = 30;
  vendas.forEach((v, idx) => {
    doc.setFontSize(12);
    doc.text(`Venda #${idx + 1} - Cliente: ${v.cliente} - Total: R$ ${v.total.toFixed(2)}`, 14, y);
    y += 8;
    v.itens.forEach(item => {
      doc.text(`   - ${item.produto} x${item.quantidade} = R$ ${item.subtotal.toFixed(2)}`, 20, y);
      y += 6;
    });
    y += 4;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("vendas.pdf");
}

// ---------------- Inicialização ----------------
window.addEventListener("load", () => {
  carregarDados();
  mostrarTela("produtos"); 

  document.getElementById("btnMenuProdutos").addEventListener("click", () => mostrarTela("produtos"));
  document.getElementById("btnMenuClientes").addEventListener("click", () => mostrarTela("clientes"));
  document.getElementById("btnMenuVendas").addEventListener("click", () => mostrarTela("vendas"));
  document.getElementById("btnMenuRelatorios").addEventListener("click", () => mostrarTela("relatorios"));

  document.getElementById("btnFinalizarVenda").addEventListener("click", finalizarVenda);
  document.getElementById("btnRelatorioClientes").addEventListener("click", relatorioClientes);
  document.getElementById("btnRelatorioProdutos").addEventListener("click", relatorioProdutos);
  document.getElementById("btnExportarVendas").addEventListener("click", exportarVendasExcel);

  let btnPDF = document.createElement("button");
  btnPDF.textContent = "📄 Exportar Vendas (PDF)";
  btnPDF.addEventListener("click", exportarVendasPDF);
  document.getElementById("relatorios").appendChild(btnPDF);
});

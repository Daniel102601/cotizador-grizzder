import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";

// GRIZZDER TECHNOLOGY — sistema visual Signature para cotizaciones.
// Mantiene el esquema de datos y usa únicamente jsPDF + jspdf-autotable.
const C = {
  navy: [11,  24, 43],
  navy2: [20, 38, 63],
  blue: [7, 87, 249],
  bluePale: [237, 243, 252],
  gold: [190, 151, 77],
  ink: [28, 40, 58],
  muted: [96, 109, 127],
  line: [222, 228, 236],
  pale: [247, 249, 252],
  white: [255, 255, 255],
};

const M = 16;
const FOOTER_SAFE = 23;

function cop(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function fechaLegible(value) {
  if (!value) return "—";
  const s = String(value);
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : s;
}

function seguro(value, fallback = "—") {
  return value === null || value === undefined || String(value).trim() === ""
    ? fallback
    : String(value).trim();
}

function cargarImagenComoDataURL(url) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
      return response.blob();
    })
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }))
    .catch((error) => {
      console.warn("Grizzder PDF: se usará el logotipo tipográfico.", error);
      return null;
    });
}

function dibujarMarca(doc, logo, compact = false) {
  const w = doc.internal.pageSize.getWidth();
  if (!compact) {
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, w, 49, "F");
    // Banda de firma y formas geométricas sutiles: identidad sin ruido visual.
    doc.setFillColor(...C.gold);
    doc.rect(0, 0, w, 1.4, "F");
    doc.setFillColor(...C.navy2);
    doc.triangle(w - 50, 0, w, 0, w, 49, "F");
    doc.setFillColor(18, 33, 57);
    doc.triangle(w - 24, 0, w, 0, w, 25, "F");

    if (logo) {
      try {
        const fmt = String(logo).startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        // Proporción real del logo: se evita deformarlo.
        const props = doc.getImageProperties(logo);
        const maxW = 49;
        const maxH = 30;
        const scale = Math.min(maxW / props.width, maxH / props.height);
        const imgW = props.width * scale;
        const imgH = props.height * scale;
        doc.addImage(logo, fmt, M, 7 + (maxH - imgH) / 2, imgW, imgH, undefined, "MEDIUM");
      } catch (error) {
        console.warn("Grizzder PDF: no fue posible insertar el logo.", error);
        dibujarLogotipoTexto(doc,  M, 20);
      }
    } else {
      dibujarLogotipoTexto(doc, M, 20);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(201, 211, 226);
    doc.text("SOLUCIONES EMPRESARIALES INTEGRALES", M, 41);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(176, 192, 215);
    doc.text("DOCUMENTO COMERCIAL  /  GRIZZDER", w - M, 10.5, { align: "right" });
    doc.setFontSize(17);
    doc.setTextColor(...C.white);
    doc.text("COTIZACIÓN", w - M, 22, { align: "right" });
    doc.setFillColor(...C.gold);
    doc.roundedRect(w - M - 48, 27, 48, 7.4, 1.1, 1.1, "F");
    doc.setFontSize(8);
    doc.setTextColor(...C.navy);
    doc.text(seguro(doc.__quoteNumber), w - M - 24, 32.1, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(216, 225, 238);
    doc.text(`EMISIÓN  /  ${fechaLegible(doc.__quoteDate)}`, w - M, 42, { align: "right" });
  } else {
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, w, 12, "F");
    doc.setFillColor(...C.gold);
    doc.rect(0, 12, w, 0.65, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...C.white);
    doc.text("GRIZZDER TECHNOLOGY", M, 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 228, 239);
    doc.text(`COTIZACIÓN  ${seguro(doc.__quoteNumber)}`, w - M, 8, { align: "right" });
  }
}

function dibujarLogotipoTexto(doc, x, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...C.white);
  doc.text("GRIZZDER", x, y);
  doc.setFontSize(7.8);
  doc.setTextColor(145, 177, 230);
  doc.text("T E C H N O L O G Y", x + 0.5, y + 6);
}

function dibujarPie(doc) {
  const pages = doc.internal.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.35);
    doc.line(M, h - 17, w - M, h - 17);
    doc.setFillColor(...C.gold);
    doc.rect(M, h - 17, 17, 0.7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(...C.navy);
    doc.text("GRIZZDER", M, h - 10.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text("TECHNOLOGY  /  SOLUCIONES EMPRESARIALES", M + 22, h - 10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.navy);
    doc.text(`${String(page).padStart(2, "0")}  /  ${String(pages).padStart(2, "0")}`, w - M, h - 10.5, { align: "right" });
  }
}

function dibujarTituloSeccion(doc, numero, titulo, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...C.blue);
  const label = `${numero}  /  ${titulo.toUpperCase()}`;
  doc.text(label, M, y);
  const labelWidth = doc.getTextWidth(label);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.35);
  doc.line(M + labelWidth + 4, y - 1, doc.internal.pageSize.getWidth() - M, y - 1);
}

function dibujarFichaCliente(doc, cliente, y) {
  const w = doc.internal.pageSize.getWidth();
  const innerW = w - M * 2;
  const fields = [];
  if (cliente?.documento) fields.push(["DOCUMENTO", String(cliente.documento)]);
  if (cliente?.telefono) fields.push(["TELÉFONO", String(cliente.telefono)]);
  if (cliente?.correo) fields.push(["CORREO", String(cliente.correo)]);

  const nombre = seguro(cliente?.nombre, "Cliente no especificado");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  const nameLines = doc.splitTextToSize(nombre, innerW - 14);
  const nameHeight = Math.min(nameLines.length, 2) * 5;
  const height = 18 + nameHeight + (fields.length ? 11 : 0) + 4;

  doc.setFillColor(...C.pale);
  doc.roundedRect(M, y, innerW, height, 2, 2, "F");
  doc.setFillColor(...C.blue);
  doc.roundedRect(M, y, 1.5, height, 0.6, 0.6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...C.gold);
  doc.text("CLIENTE  /  PREPARADO PARA", M + 7, y + 7.2);
  doc.setFontSize(11.5);
  doc.setTextColor(...C.navy);
  doc.text(nameLines.slice(0, 2), M + 7, y + 14.5);

  if (fields.length) {
    const startY = y + 17 + nameHeight;
    const startX = M + 7;
    const availableW = innerW - 14;
    const colW = availableW / fields.length;
    fields.forEach(([label, value], index) => {
      const x = startX + index * colW;
      if (index > 0) {
        doc.setDrawColor(...C.line);
        doc.setLineWidth(0.3);
        doc.line(x - 3, startY - 3.2, x - 3, startY + 3.5);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(...C.muted);
      doc.text(label, x, startY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.ink);
      const valLines = doc.splitTextToSize(value, colW - 5);
      doc.text(valLines[0], x, startY + 4);
    });
  }
  return y + height;
}

export async function generarPDFCotizacion(cotizacionId) {
  if (!cotizacionId) throw new Error("No se recibió el identificador de la cotización.");

  const [resCotizacion, resItems] = await Promise.all([
    supabase.from("cotizaciones").select("*").eq("id", cotizacionId).maybeSingle(),
    // Lista blanca de campos comerciales: nunca se consultan costos ni márgenes.
    supabase.from("cotizacion_items")
      .select("concepto, descripcion, cantidad, precio_unitario, total")
      .eq("cotizacion_id", cotizacionId),
  ]);

  if (resCotizacion.error) throw resCotizacion.error;
  if (!resCotizacion.data) throw new Error("No se encontró la cotización solicitada.");
  if (resItems.error) throw resItems.error;

  const cotizacion = resCotizacion.data;
  const items = resItems.data || [];
  let cliente = null;

  if (cotizacion.cliente_id) {
    const { data, error } = await supabase.from("clientes")
      .select("id, nombre, documento, telefono, correo")
      .eq("id", cotizacion.cliente_id)
      .maybeSingle();
    if (error) throw error;
    cliente = data;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.__quoteNumber = seguro(cotizacion.numero);
  doc.__quoteDate = cotizacion.fecha;
  const logo = await cargarImagenComoDataURL("/grizzder-logo.png");

  dibujarMarca(doc, logo, false);

  // Bloque cliente y modalidad: la modalidad es informativa; ambas usan la misma tabla.
  let y = 57;
  dibujarTituloSeccion(doc, "01", "Información del cliente", y);
  y += 6;
  y = dibujarFichaCliente(doc, cliente, y);
  y += 10;

  const modalidad = cotizacion.modo_presentacion === "desglosada"
    ? "DESGLOSE COMERCIAL"
    : "PRECIO GLOBAL";
  dibujarTituloSeccion(doc, "02", "Propuesta económica", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.6);
  doc.setTextColor(...C.muted);
  doc.text(modalidad, pageW - M, y + 6, { align: "right" });
  y += 9;

  const bodyRows = items.map((item) => [
    seguro(item.concepto, "Servicio"),
    seguro(item.descripcion),
    String(Number(item.cantidad) || 0),
    cop(item.precio_unitario),
    cop(item.total),
  ]);
  if (!bodyRows.length) bodyRows.push(["Sin conceptos registrados", "—", "0", cop(0), cop(0)]);

  autoTable(doc, {
    startY: y,
    head: [["CONCEPTO", "DESCRIPCIÓN", "CANT.", "PRECIO UNITARIO", "TOTAL"]],
    body: bodyRows,
    theme: "plain",
    margin: { left: M, right: M, top: 18, bottom: FOOTER_SAFE },
    showHead: "everyPage",
    pageBreak: "auto",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 7.6,
      textColor: C.ink,
      cellPadding: { top: 4.4, right: 2.7, bottom: 4.4, left: 2.7 },
      overflow: "linebreak",
      valign: "middle",
      lineWidth: 0,
    },
    headStyles: {
      fillColor: C.navy,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 6.4,
      cellPadding: { top: 4.8, right: 2.7, bottom: 4.8, left: 2.7 },
    },
    alternateRowStyles: { fillColor: C.pale },
    columnStyles: {
      0: { cellWidth: 33, fontStyle: "bold" },
      1: { cellWidth: "auto", textColor: C.muted },
      2: { cellWidth: 12, halign: "center" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 27, halign: "right", fontStyle: "bold", textColor: C.navy },
    },
    didParseCell: (data) => {
      if (data.section === "body" && (data.column.index === 0 || data.column.index === 4)) {
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawCell: (data) => {
      if (data.section === "body") {
        doc.setDrawColor(...C.line);
        doc.setLineWidth(0.22);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) dibujarMarca(doc, logo, true);
    },
  });

  let yAfterTable = doc.lastAutoTable.finalY + 9;
  const subtotal = Number(cotizacion.subtotal) || 0;
  const total = Number(cotizacion.total) || 0;
  const summaryH = 32;

  // El resumen no se divide ni se superpone con el pie de página.
  if (yAfterTable + summaryH > pageH - FOOTER_SAFE) {
    doc.addPage();
    dibujarMarca(doc, logo, true);
    yAfterTable = 24;
  }

  const summaryW = 88;
  const summaryX = pageW - M - summaryW;
  doc.setFillColor(...C.navy);
  doc.roundedRect(summaryX, yAfterTable, summaryW, summaryH, 2.4, 2.4, "F");
  doc.setFillColor(...C.gold);
  doc.roundedRect(summaryX, yAfterTable, 1.7, summaryH, 0.6, 0.6, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(213, 222, 235);
  doc.text("VALOR ANTES DE AJUSTES", summaryX + 6, yAfterTable + 8);
  doc.text(cop(subtotal), pageW - M - 5, yAfterTable + 8, { align: "right" });
  doc.setDrawColor(64, 79, 102);
  doc.setLineWidth(0.3);
  doc.line(summaryX + 6, yAfterTable + 13, pageW - M - 5, yAfterTable + 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...C.gold);
  doc.text("INVERSIÓN TOTAL", summaryX + 6, yAfterTable + 20);
  doc.setFontSize(11.5);
  doc.setTextColor(...C.white);
  doc.text(cop(total), pageW - M - 5, yAfterTable + 27, { align: "right" });

  yAfterTable += summaryH + 11;
  const conditions = [];
  if (cotizacion.garantia) conditions.push(["GARANTÍA", String(cotizacion.garantia)]);
  if (cotizacion.tiempo_entrega) conditions.push(["TIEMPO DE ENTREGA", String(cotizacion.tiempo_entrega)]);
  if (cotizacion.observaciones) conditions.push(["OBSERVACIONES", String(cotizacion.observaciones)]);

  if (conditions.length) {
    const remaining = pageH - FOOTER_SAFE - yAfterTable;
    if (remaining < 17) {
      doc.addPage();
      dibujarMarca(doc, logo, true);
      yAfterTable = 24;
    }

    dibujarTituloSeccion(doc, "03", "Condiciones comerciales", yAfterTable);
    yAfterTable += 7;

    for (const [label, value] of conditions) {
      const labelW = label === "TIEMPO DE ENTREGA" ? 35 : label === "OBSERVACIONES" ? 29 : 19;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      const valueWidth = pageW - M * 2 - labelW - 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const lines = doc.splitTextToSize(value, valueWidth);
      const needed = Math.max(5.5, lines.length * 4) + 3.2;

      if (yAfterTable + needed > pageH - FOOTER_SAFE) {
        doc.addPage();
        dibujarMarca(doc, logo, true);
        yAfterTable = 24;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.6);
      doc.setTextColor(...C.navy);
      doc.text(label, M, yAfterTable);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      doc.text(lines, M + labelW + 3, yAfterTable);
      yAfterTable += needed;
    }
  }

  // Pie uniforme y numeración real de todas las páginas.
  dibujarPie(doc);

  const fileName = seguro(cotizacion.numero, "cotizacion")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`${fileName}.pdf`);
}

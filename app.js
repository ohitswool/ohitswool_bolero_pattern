let patternTemplate = "";
let currentPdfBlob = null;
let currentPdfUrl = "";
let previewTimer = null;
let renderVersion = 0;

const imageDataCache = new Map();
const pdfColors = {
    ink: "#302720",
    muted: "#796C62",
    line: "#DED3C6",
    paperTint: "#FFFDF9",
    purple: "#8F29E8",
    purpleTint: "#F8F1FD"
};

async function loadPatternTemplate() {
    const response = await fetch("pattern.md");
    patternTemplate = await response.text();
    updatePreview();
}

function getInputs() {
    const gaugeAcrossSts = Number(document.getElementById("gaugeAcrossSts").value);
    const gaugeAcrossCm = Number(document.getElementById("gaugeAcrossCm").value);

    const gaugeDownRows = Number(document.getElementById("gaugeDownRows").value);
    const gaugeDownCm = Number(document.getElementById("gaugeDownCm").value);

    return {
        bust: Number(document.getElementById("bust").value),
        shoulder: Number(document.getElementById("shoulder").value),
        armhole: Number(document.getElementById("armhole").value),
        upperArm: Number(document.getElementById("upperArm").value),

        gaugeAcrossSts,
        gaugeAcrossCm,
        gaugeDownRows,
        gaugeDownCm,

        gaugeAcross: gaugeAcrossSts / gaugeAcrossCm,
        gaugeDown: gaugeDownRows / gaugeDownCm
    };
}

function fillTemplate(template, values) {
    let result = template;

    for (const key in values) {
        const placeholder = new RegExp(`{${key}}`, "g");
        result = result.replace(
            placeholder,
            `<span class="pattern-value">${values[key]}</span>`
        );
    }

    return result;
}

function formatPattern(markdown) {
    const container = document.createElement("div");
    container.innerHTML = marked.parse(markdown);

    const logoParagraph = container.querySelector("p:first-child");
    const title = logoParagraph?.nextElementSibling;
    const logo = logoParagraph?.querySelector("img");

    if (logo && title?.tagName === "H1") {
        logo.classList.add("pattern-logo");

        const brand = document.createElement("div");
        brand.className = "pattern-brand";
        logoParagraph.replaceWith(brand);
        brand.append(logo, title);
    }

    container.querySelectorAll("blockquote").forEach(blockquote => {
        const blockquoteText = blockquote.textContent.trim();
        const isVisualPlaceholder =
            blockquoteText.startsWith("Diagram:")
            || blockquoteText.startsWith("Photo:");

        if (isVisualPlaceholder) {
            const paragraphs = blockquote.querySelectorAll("p");
            const titleText = paragraphs[0].textContent.replace(
                /^(?:Diagram|Photo):\s*/,
                ""
            );
            const description = paragraphs[1]?.textContent ?? "";

            blockquote.className = "pattern-diagram-placeholder";
            blockquote.replaceChildren();

            const title = document.createElement("strong");
            title.textContent = titleText;
            const caption = document.createElement("span");
            caption.textContent = description;
            blockquote.append(title, caption);
        } else if (
            blockquoteText.startsWith("Buttonhole guide")
            || blockquoteText.startsWith("Button position guide")
            || blockquoteText.startsWith("Pattern use and disclaimer")
            || blockquoteText.startsWith("Pickup guide")
            || blockquoteText.startsWith("Share your bolero")
            || blockquoteText.startsWith("Sleeve seaming guide")
        ) {
            blockquote.className = "pattern-callout";
        } else {
            blockquote.className = "pattern-note";
        }
    });

    container.querySelectorAll("ul").forEach(rows => {
        rows.className = "pattern-rows";

        const previous = rows.previousElementSibling;
        const block = document.createElement("div");
        block.className = "pattern-instruction-block";
        rows.before(block);

        const previousText = previous?.textContent.trim() ?? "";
        const introducesRows =
            previousText.startsWith("Repeat")
            || previousText.startsWith("If ")
            || previousText.endsWith(":");

        if (previous?.tagName === "P" && introducesRows) {
            previous.className = "pattern-repeat";
            block.append(previous);
        }

        block.append(rows);
    });

    container.querySelectorAll("p").forEach(paragraph => {
        const text = paragraph.textContent.trim();
        if (text.startsWith("Long tail cast on") || text.startsWith("With the")) {
            paragraph.classList.add("pattern-lead");
        }
    });

    return container.innerHTML;
}

function normalizeInlineText(text) {
    return text
        .replace(/[–—‑]/g, "-")
        .replace(/\s+/g, " ");
}

function getInlineFragments(node, inheritedStyle = {}) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = normalizeInlineText(node.nodeValue ?? "");
        return text ? [{ text, ...inheritedStyle }] : [];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const element = node;
    const tag = element.tagName;

    if (tag === "BR") return [{ text: "\n", ...inheritedStyle }];
    if (tag === "IMG") return [];

    const style = { ...inheritedStyle };

    if (tag === "STRONG" || tag === "B") style.bold = true;
    if (tag === "EM" || tag === "I") style.italics = true;
    if (element.classList.contains("pattern-value")) {
        style.bold = true;
        style.color = pdfColors.purple;
    }
    if (tag === "A") {
        style.link = element.href;
        style.color = pdfColors.purple;
        style.decoration = "underline";
    }

    return Array.from(element.childNodes).flatMap(child =>
        getInlineFragments(child, style)
    );
}

function compactInlineFragments(fragments) {
    return fragments.filter(fragment => fragment.text !== "");
}

function imageToDataUrl(source) {
    const absoluteUrl = new URL(source, document.baseURI).href;

    if (imageDataCache.has(absoluteUrl)) {
        return imageDataCache.get(absoluteUrl);
    }

    const imagePromise = new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";

        image.addEventListener("load", () => {
            const maxWidth = 1400;
            const maxHeight = 1100;
            const scale = Math.min(
                1,
                maxWidth / image.naturalWidth,
                maxHeight / image.naturalHeight
            );
            const width = Math.max(1, Math.round(image.naturalWidth * scale));
            const height = Math.max(1, Math.round(image.naturalHeight * scale));
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = width;
            canvas.height = height;
            context.fillStyle = "#FFFFFF";
            context.fillRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
        }, { once: true });

        image.addEventListener("error", () => {
            reject(new Error(`Unable to load image: ${source}`));
        }, { once: true });

        image.src = absoluteUrl;
    });

    imageDataCache.set(absoluteUrl, imagePromise);
    return imagePromise;
}

async function imageElementToPdf(image, options = {}) {
    try {
        const imageData = await imageToDataUrl(image.getAttribute("src"));
        const title = image.getAttribute("title") ?? "";
        const widthMatch = title.match(/(?:^|\s)pdf-width\s*=\s*(\d+(?:\.\d+)?)/i);
        const requestedWidth = widthMatch
            ? Math.min(504, Math.max(80, Number(widthMatch[1])))
            : null;
        const pdfImage = {
            image: imageData,
            alignment: options.alignment ?? "center",
            margin: options.margin ?? [0, 8, 0, 10]
        };

        if (requestedWidth) {
            pdfImage.width = requestedWidth;
        } else {
            pdfImage.fit = options.fit ?? [470, 330];
        }

        return pdfImage;
    } catch (error) {
        console.warn(error);
        return {
            text: image.alt ? `[Image: ${image.alt}]` : "[Image unavailable]",
            color: pdfColors.muted,
            italics: true,
            alignment: "center",
            margin: [0, 6, 0, 8]
        };
    }
}

function flattenPdfItems(items) {
    return items.flat(Infinity).filter(Boolean);
}

async function childrenToPdf(element) {
    const items = await Promise.all(
        Array.from(element.children).map(child => elementToPdf(child))
    );
    return flattenPdfItems(items);
}

async function elementToPdf(element) {
    const tag = element.tagName;

    if (/^H[1-4]$/.test(tag)) {
        const level = Number(tag.slice(1));
        const heading = {
            text: compactInlineFragments(getInlineFragments(element)),
            style: `heading${level}`,
            headlineLevel: level,
            margin: level === 1 ? [0, 0, 0, 8] : undefined
        };

        if (level === 2 && element.textContent.trim() === "Finishing") {
            heading.pageBreak = "before";
        }

        return heading;
    }

    if (tag === "P") {
        const images = Array.from(element.querySelectorAll("img"));
        if (images.length && element.textContent.trim() === "") {
            return Promise.all(images.map(image => imageElementToPdf(image)));
        }

        const text = compactInlineFragments(getInlineFragments(element));
        if (!text.length) return null;

        return {
            text,
            margin: [0, 0, 0, 7]
        };
    }

    if (tag === "IMG") {
        return imageElementToPdf(element);
    }

    if (tag === "HR") {
        return {
            canvas: [{
                type: "line",
                x1: 0,
                y1: 0,
                x2: 504,
                y2: 0,
                lineWidth: 0.8,
                lineColor: pdfColors.line
            }],
            margin: [0, 10, 0, 10]
        };
    }

    if (tag === "TABLE") {
        const rows = Array.from(element.rows).map((row, rowIndex) =>
            Array.from(row.cells).map(cell => ({
                text: compactInlineFragments(getInlineFragments(cell)),
                bold: rowIndex === 0 || cell.tagName === "TH",
                fillColor: rowIndex === 0 ? "#F1E8DC" : pdfColors.paperTint,
                margin: [5, 4, 5, 4]
            }))
        );

        return {
            table: {
                headerRows: 1,
                widths: ["*", "auto"],
                body: rows,
                dontBreakRows: true
            },
            layout: {
                hLineColor: () => pdfColors.line,
                vLineColor: () => pdfColors.line,
                hLineWidth: () => 0.7,
                vLineWidth: () => 0.7,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0
            },
            margin: [0, 4, 0, 12]
        };
    }

    if (tag === "UL" || tag === "OL") {
        const items = Array.from(element.children)
            .filter(child => child.tagName === "LI")
            .map(item => ({
                text: compactInlineFragments(getInlineFragments(item)),
                margin: [0, 1, 0, 2]
            }));

        return {
            [tag === "OL" ? "ol" : "ul"]: items,
            margin: [18, 1, 0, 8]
        };
    }

    if (tag === "BLOCKQUOTE") {
        const stack = await childrenToPdf(element);
        const isCallout = element.classList.contains("pattern-callout");

        if (!isCallout) {
            return {
                stack,
                bold: true,
                margin: [0, 8, 0, 10]
            };
        }

        return {
            table: {
                widths: ["*"],
                dontBreakRows: true,
                body: [[{
                    stack,
                    fillColor: pdfColors.purpleTint,
                    margin: [10, 7, 10, 6]
                }]]
            },
            layout: {
                hLineWidth: () => 0.7,
                vLineWidth: index => index === 0 ? 3 : 0.7,
                hLineColor: () => "#DEC7F2",
                vLineColor: index => index === 0 ? pdfColors.purple : "#DEC7F2",
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0
            },
            margin: [0, 7, 0, 12]
        };
    }

    if (tag === "DIV" && element.classList.contains("pattern-brand")) {
        const logo = element.querySelector("img");
        const title = element.querySelector("h1");
        const logoData = logo ? await imageToDataUrl(logo.getAttribute("src")) : null;

        return {
            columns: [
                logoData ? { image: logoData, fit: [52, 52], width: 58 } : { text: "", width: 0 },
                {
                    text: title?.textContent ?? "Oh It's Wool",
                    style: "brandTitle",
                    margin: [0, 13, 0, 0]
                }
            ],
            columnGap: 8,
            margin: [115, 0, 80, 4]
        };
    }

    if (tag === "DIV" || tag === "SECTION") {
        const stack = await childrenToPdf(element);
        if (!stack.length) return null;

        return {
            stack,
            margin: element.classList.contains("pattern-instruction-block")
                ? [0, 3, 0, 6]
                : [0, 0, 0, 0]
        };
    }

    const children = await childrenToPdf(element);
    return children.length ? children : null;
}

async function buildPdfDefinition(patternHtml) {
    const container = document.createElement("div");
    container.innerHTML = patternHtml;
    const content = await childrenToPdf(container);

    return {
        info: {
            title: "Oh It's Wool - Custom Bolero Pattern",
            author: "Oh It's Wool (@ohitswool)",
            subject: "Made-to-measure knitting pattern"
        },
        pageSize: "LETTER",
        pageMargins: [54, 48, 54, 50],
        background: () => ({
            canvas: [{
                type: "rect",
                x: 0,
                y: 0,
                w: 612,
                h: 792,
                color: "#FFFFFF"
            }]
        }),
        footer: (currentPage, pageCount) => ({
            margin: [54, 6, 54, 0],
            stack: [
                {
                    canvas: [{
                        type: "line",
                        x1: 0,
                        y1: 0,
                        x2: 504,
                        y2: 0,
                        lineWidth: 0.6,
                        lineColor: pdfColors.line
                    }]
                },
                {
                    columns: [
                        { text: "© Oh It's Wool · @ohitswool", color: pdfColors.muted },
                        {
                            text: `Page ${currentPage} of ${pageCount}`,
                            alignment: "right",
                            color: pdfColors.muted
                        }
                    ],
                    fontSize: 8,
                    margin: [0, 5, 0, 0]
                }
            ]
        }),
        content,
        defaultStyle: {
            font: "Roboto",
            fontSize: 10.3,
            color: pdfColors.ink,
            lineHeight: 1.3
        },
        styles: {
            brandTitle: {
                fontSize: 24,
                bold: true,
                color: pdfColors.ink
            },
            heading1: {
                fontSize: 24,
                bold: true,
                alignment: "center",
                color: pdfColors.ink
            },
            heading2: {
                fontSize: 18,
                bold: true,
                color: pdfColors.ink,
                margin: [0, 14, 0, 7]
            },
            heading3: {
                fontSize: 13.5,
                bold: true,
                color: pdfColors.ink,
                margin: [0, 10, 0, 5]
            },
            heading4: {
                fontSize: 11,
                bold: true,
                color: pdfColors.ink,
                margin: [0, 8, 0, 4]
            }
        },
        pageBreakBefore: (currentNode, followingNodesOnPage) =>
            Boolean(currentNode.headlineLevel && followingNodesOnPage.length === 0)
    };
}

function createPdfBlob(documentDefinition) {
    return new Promise((resolve, reject) => {
        try {
            pdfMake.createPdf(documentDefinition).getBlob(resolve);
        } catch (error) {
            reject(error);
        }
    });
}

async function updatePreview() {
    if (!patternTemplate) return null;

    const version = ++renderVersion;
    const preview = document.getElementById("preview");
    const status = document.getElementById("previewStatus");

    status.hidden = false;
    status.textContent = currentPdfBlob ? "Updating pages…" : "Preparing paginated preview…";

    try {
        const values = calculatePattern(getInputs());
        const filledMarkdown = fillTemplate(patternTemplate, values);
        const patternHtml = formatPattern(filledMarkdown);
        const documentDefinition = await buildPdfDefinition(patternHtml);
        const blob = await createPdfBlob(documentDefinition);

        if (version !== renderVersion) return null;

        if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
        currentPdfBlob = blob;
        currentPdfUrl = URL.createObjectURL(blob);

        preview.addEventListener("load", () => {
            status.hidden = true;
        }, { once: true });
        preview.src = `${currentPdfUrl}#page=1&zoom=page-width&toolbar=1`;

        return blob;
    } catch (error) {
        console.error("Unable to build the pattern PDF:", error);
        status.textContent = "Preview unavailable. Check the browser console for details.";
        return null;
    }
}

function schedulePreviewUpdate() {
    clearTimeout(previewTimer);
    const status = document.getElementById("previewStatus");
    status.hidden = false;
    status.textContent = "Updating pages…";
    previewTimer = setTimeout(updatePreview, 350);
}

async function downloadPDF() {
    const downloadButton = document.getElementById("downloadBtn");

    clearTimeout(previewTimer);
    downloadButton.disabled = true;
    downloadButton.textContent = "Preparing your pattern…";

    try {
        const blob = await updatePreview();
        if (!blob) throw new Error("The PDF could not be generated.");

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = "ohitswool-custom-bolero.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
        console.error("Unable to download the pattern PDF:", error);
        window.alert("The PDF could not be created. Please try again.");
    } finally {
        downloadButton.disabled = false;
        downloadButton.innerHTML = "Download your pattern <span aria-hidden=\"true\">↓</span>";
    }
}

[
    "bust",
    "shoulder",
    "armhole",
    "upperArm",
    "gaugeAcrossSts",
    "gaugeAcrossCm",
    "gaugeDownRows",
    "gaugeDownCm"
].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener("input", schedulePreviewUpdate);
    }
});

document.getElementById("downloadBtn").addEventListener("click", downloadPDF);

window.addEventListener("beforeunload", () => {
    if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
});

loadPatternTemplate();

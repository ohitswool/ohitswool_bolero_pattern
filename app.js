let patternTemplate = "";
let currentPdfBlob = null;
let currentPdfUrl = "";
let previewTimer = null;
let renderVersion = 0;
let mobilePdfDocument = null;
let mobilePdfPageNumber = 1;
let mobilePdfRenderTask = null;
let mobilePdfPageRenderVersion = 0;
let mobileSwipeStartX = null;

const imageDataCache = new Map();
const pdfColors = {
    ink: "#302720",
    muted: "#796C62",
    line: "#DED3C6",
    paperTint: "#FFFDF9",
    purple: "#8F29E8",
    purpleTint: "#F8F1FD"
};
const instagramUrl = "https://www.instagram.com/ohitswool/";
const mobilePreviewQuery = window.matchMedia("(max-width: 800px)");

if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

async function loadPatternTemplate() {
    const response = await fetch("pattern.md?v=20260921-1");
    patternTemplate = await response.text();
    updatePreview();
}

function getInputs() {
    const gaugeAcrossSts = Number(document.getElementById("gaugeAcrossSts").value);
    const gaugeAcrossCm = Number(document.getElementById("gaugeAcrossCm").value);

    const gaugeDownRows = Number(document.getElementById("gaugeDownRows").value);
    const gaugeDownCm = Number(document.getElementById("gaugeDownCm").value);
    const swatchYarnLength = Number(document.getElementById("swatchYarnLength").value);
    const swatchYarnUnit = document.getElementById("swatchYarnUnit").value;

    return {
        bust: Number(document.getElementById("bust").value),
        shoulder: Number(document.getElementById("shoulder").value),
        armhole: Number(document.getElementById("armhole").value),
        upperArm: Number(document.getElementById("upperArm").value),
        finishedLengthCm: Number(document.getElementById("finishedLengthCm").value),

        gaugeAcrossSts,
        gaugeAcrossCm,
        gaugeDownRows,
        gaugeDownCm,
        swatchYarnLength,
        swatchYarnUnit,

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
        const logoLink = logo.closest("a");
        logoLink?.classList.add("pattern-logo-link");

        const brand = document.createElement("div");
        brand.className = "pattern-brand";
        logoParagraph.replaceWith(brand);
        brand.append(logoLink ?? logo, title);
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
            || blockquoteText.startsWith("Before you begin")
        ) {
            blockquote.className = blockquoteText.startsWith("Share your bolero")
                ? "pattern-callout pattern-share-callout"
                : "pattern-callout";
        } else {
            blockquote.className = "pattern-note";
        }
    });

    const keepSectionStartTogether = (headingText, followingSiblingCount) => {
        const heading = Array.from(container.querySelectorAll("h2"))
            .find(candidate => candidate.textContent.trim() === headingText);

        if (!heading) return;

        const sectionElements = [heading];
        let nextElement = heading.nextElementSibling;

        for (let index = 0; index < followingSiblingCount && nextElement; index += 1) {
            sectionElements.push(nextElement);
            nextElement = nextElement.nextElementSibling;
        }

        const sectionStart = document.createElement("div");
        sectionStart.className = "pattern-section-start";
        heading.before(sectionStart);
        sectionStart.append(...sectionElements);
    };

    keepSectionStartTogether("Neckline I-Cord Edging", 1);
    keepSectionStartTogether("Sleeves", 2);
    keepSectionStartTogether("Front Right (Buttonhole Side)", 2);
    keepSectionStartTogether("Front Left (Button Side)", 2);
    keepSectionStartTogether("Join Front Left, Back and Front Right", 3);

    const pairedImages = Array.from(
        container.querySelectorAll('img[title~="pdf-pair"]')
    );

    for (let index = 0; index < pairedImages.length; index += 2) {
        const firstParagraph = pairedImages[index]?.closest("p");
        const secondParagraph = pairedImages[index + 1]?.closest("p");

        if (!firstParagraph || !secondParagraph) continue;

        const possibleCaption = firstParagraph.previousElementSibling;
        const caption = possibleCaption?.tagName === "P"
            && possibleCaption.textContent.trim().startsWith("This is what the completed sleeve-cap pleats")
            ? possibleCaption
            : null;
        const pair = document.createElement("div");
        pair.className = "pattern-image-pair";
        (caption ?? firstParagraph).before(pair);

        if (caption) {
            caption.className = "pattern-image-pair-caption";
            pair.append(caption);
        }

        pair.append(firstParagraph, secondParagraph);
    }

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
        const isShortSectionHeading =
            previous?.tagName === "P"
            && previous.children.length === 1
            && previous.firstElementChild?.tagName === "STRONG";

        if (previous?.tagName === "P" && (introducesRows || isShortSectionHeading)) {
            previous.className = "pattern-repeat";
            block.append(previous);
        }

        block.append(rows);
    });

    container.querySelectorAll('img[title~="pdf-aside"]').forEach(image => {
        const imageParagraph = image.closest("p");
        const instructionElement = imageParagraph?.previousElementSibling;
        const canSitBesideImage =
            instructionElement?.classList.contains("pattern-instruction-block")
            || instructionElement?.tagName === "P";

        if (!imageParagraph || !canSitBesideImage) {
            return;
        }

        const aside = document.createElement("div");
        aside.className = "pattern-image-aside";
        instructionElement.before(aside);
        aside.append(instructionElement, imageParagraph);
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
            heading.margin = [0, 8, 0, 4];
        }

        if (level === 2 && element.textContent.trim() === "Join Back Right and Back Left") {
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
            margin: [0, 0, 0, 5]
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
            margin: [0, 8, 0, 8]
        };
    }

    if (tag === "TABLE") {
        if (element.classList.contains("abbreviation-grid")) {
            const abbreviationRows = Array.from(element.rows).map(row =>
                Array.from(row.cells).map(cell => ({
                    text: compactInlineFragments(getInlineFragments(cell)),
                    margin: [0, 0.3, 6, 0.3]
                }))
            );
            const abbreviationColumnCount = Math.max(
                ...abbreviationRows.map(row => row.length)
            );

            return {
                table: {
                    widths: Array(abbreviationColumnCount).fill("*"),
                    body: abbreviationRows,
                    dontBreakRows: true
                },
                layout: {
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                    paddingLeft: () => 0,
                    paddingRight: () => 8,
                    paddingTop: () => 0,
                    paddingBottom: () => 0
                },
                fontSize: 8.6,
                lineHeight: 1.05,
                margin: [0, 0, 0, 5]
            };
        }

        const rows = Array.from(element.rows).map((row, rowIndex) =>
            Array.from(row.cells).map(cell => ({
                text: compactInlineFragments(getInlineFragments(cell)),
                bold: rowIndex === 0 || cell.tagName === "TH",
                fillColor: rowIndex === 0 ? "#F1E8DC" : pdfColors.paperTint,
                margin: [5, 3, 5, 3]
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
            margin: [0, 3, 0, 9]
        };
    }

    if (tag === "UL" || tag === "OL") {
        const items = Array.from(element.children)
            .filter(child => child.tagName === "LI")
            .map(item => ({
                text: compactInlineFragments(getInlineFragments(item)),
                margin: [0, 0.5, 0, 1.5]
            }));

        return {
            [tag === "OL" ? "ol" : "ul"]: items,
            margin: [18, 1, 0, 6]
        };
    }

    if (tag === "BLOCKQUOTE") {
        const stack = await childrenToPdf(element);
        const isCallout = element.classList.contains("pattern-callout");
        const isShareCallout = element.classList.contains("pattern-share-callout");

        if (!isCallout) {
            return {
                stack,
                bold: true,
                margin: [0, 6, 0, 8]
            };
        }

        return {
            table: {
                widths: ["*"],
                dontBreakRows: true,
                body: [[{
                    stack,
                    fillColor: pdfColors.purpleTint,
                    margin: isShareCallout ? [10, 4, 10, 3] : [10, 7, 10, 6]
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
            margin: isShareCallout ? [0, 2, 0, 4] : [0, 6, 0, 9]
        };
    }

    if (tag === "DIV" && element.classList.contains("pattern-image-pair")) {
        const caption = element.querySelector(".pattern-image-pair-caption");
        const images = Array.from(element.querySelectorAll("img"));
        const renderedCaption = caption ? await elementToPdf(caption) : null;
        const renderedImages = await Promise.all(images.map(async image => {
            const rendered = await imageElementToPdf(image, {
                margin: [0, 0, 0, 0]
            });

            if (rendered.image) {
                delete rendered.fit;
                rendered.width = 105;
            }

            return {
                width: "*",
                stack: [rendered]
            };
        }));

        return {
            stack: [
                renderedCaption,
                {
                    columns: renderedImages,
                    columnGap: 12
                }
            ].filter(Boolean),
            unbreakable: true,
            margin: [0, 2, 0, 4]
        };
    }

    if (tag === "DIV" && element.classList.contains("pattern-image-aside")) {
        const instructionElement = Array.from(element.children)
            .find(child => !child.querySelector("img"));
        const image = element.querySelector("img");
        const instructionContent = instructionElement
            ? await elementToPdf(instructionElement)
            : null;
        const renderedImage = image
            ? await imageElementToPdf(image, { margin: [0, 0, 0, 0] })
            : null;

        if (renderedImage?.image) {
            delete renderedImage.fit;
            renderedImage.width = Math.min(renderedImage.width ?? 150, 150);
        }

        return {
            columns: [
                { width: "*", stack: instructionContent ? [instructionContent] : [] },
                { width: 160, stack: renderedImage ? [renderedImage] : [] }
            ],
            columnGap: 12,
            unbreakable: true,
            margin: [0, 2, 0, 8]
        };
    }

    if (tag === "DIV" && element.classList.contains("pattern-brand")) {
        const logo = element.querySelector("img");
        const title = element.querySelector("h1");
        const logoLink = logo?.closest("a")?.href ?? instagramUrl;
        const logoData = logo ? await imageToDataUrl(logo.getAttribute("src")) : null;
        const roundLogoSvg = logoData ? `
            <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
                <defs>
                    <clipPath id="logo-circle"><circle cx="26" cy="26" r="24"/></clipPath>
                </defs>
                <circle cx="26" cy="26" r="25" fill="#F8F1FD" stroke="#8F29E8" stroke-width="1.5"/>
                <image href="${logoData}" x="2" y="2" width="48" height="48" preserveAspectRatio="xMidYMid slice" clip-path="url(#logo-circle)"/>
            </svg>
        ` : null;

        return {
            columns: [
                roundLogoSvg ? { svg: roundLogoSvg, width: 52, link: logoLink } : { text: "", width: 0 },
                {
                    text: title?.textContent ?? "Oh It's Wool",
                    style: "brandTitle",
                    link: instagramUrl,
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

        const isInstructionBlock = element.classList.contains("pattern-instruction-block");
        const isSectionStart = element.classList.contains("pattern-section-start");

        return {
            stack,
            unbreakable: isInstructionBlock || isSectionStart,
            margin: isInstructionBlock
                ? [0, 2, 0, 4]
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
        pageMargins: [54, 44, 54, 48],
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
                        {
                            text: "© Oh It's Wool · @ohitswool",
                            color: pdfColors.muted,
                            link: instagramUrl
                        },
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
            fontSize: 10.2,
            color: pdfColors.ink,
            lineHeight: 1.24
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
                margin: [0, 11, 0, 6]
            },
            heading3: {
                fontSize: 13.5,
                bold: true,
                color: pdfColors.ink,
                margin: [0, 8, 0, 4]
            },
            heading4: {
                fontSize: 11,
                bold: true,
                color: pdfColors.ink,
                margin: [0, 6, 0, 3]
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

function updateMobilePdfControls() {
    const pageCount = mobilePdfDocument?.numPages ?? 0;
    const indicator = document.getElementById("pdfPageIndicator");
    const previousButton = document.getElementById("previousPdfPage");
    const nextButton = document.getElementById("nextPdfPage");

    indicator.textContent = pageCount
        ? `Page ${mobilePdfPageNumber} of ${pageCount}`
        : "Page 1";
    previousButton.disabled = mobilePdfPageNumber <= 1;
    nextButton.disabled = !pageCount || mobilePdfPageNumber >= pageCount;
}

async function renderMobilePdfPage(pageNumber, version = renderVersion) {
    if (!mobilePdfDocument) return;

    const pageRenderVersion = ++mobilePdfPageRenderVersion;
    const pageCount = mobilePdfDocument.numPages;
    mobilePdfPageNumber = Math.min(Math.max(pageNumber, 1), pageCount);
    updateMobilePdfControls();

    if (mobilePdfRenderTask) {
        mobilePdfRenderTask.cancel();
        mobilePdfRenderTask = null;
    }

    const page = await mobilePdfDocument.getPage(mobilePdfPageNumber);
    if (version !== renderVersion || pageRenderVersion !== mobilePdfPageRenderVersion) return;

    const canvas = document.getElementById("mobilePdfCanvas");
    const preview = document.getElementById("mobilePdfPreview");
    const context = canvas.getContext("2d", { alpha: false });
    const unscaledViewport = page.getViewport({ scale: 1 });
    const availableWidth = Math.max(260, preview.clientWidth - 20);
    const cssScale = availableWidth / unscaledViewport.width;
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    const renderViewport = page.getViewport({ scale: cssScale * outputScale });

    canvas.width = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);
    canvas.style.width = `${Math.floor(renderViewport.width / outputScale)}px`;
    canvas.style.height = `${Math.floor(renderViewport.height / outputScale)}px`;
    canvas.setAttribute("aria-label", `Custom pattern PDF, page ${mobilePdfPageNumber} of ${pageCount}`);

    const renderTask = page.render({
        canvasContext: context,
        viewport: renderViewport
    });
    mobilePdfRenderTask = renderTask;

    try {
        await renderTask.promise;
    } catch (error) {
        if (error?.name !== "RenderingCancelledException") throw error;
    } finally {
        if (mobilePdfRenderTask === renderTask) mobilePdfRenderTask = null;
    }
}

async function showMobilePdfPreview(blob, version) {
    const iframe = document.getElementById("preview");
    const mobilePreview = document.getElementById("mobilePdfPreview");

    iframe.hidden = true;
    mobilePreview.hidden = false;

    if (!window.pdfjsLib) {
        throw new Error("The mobile PDF viewer did not load.");
    }

    const pdfData = new Uint8Array(await blob.arrayBuffer());
    const nextDocument = await window.pdfjsLib.getDocument({ data: pdfData }).promise;

    if (version !== renderVersion) {
        await nextDocument.destroy();
        return;
    }

    if (mobilePdfDocument) await mobilePdfDocument.destroy();
    mobilePdfDocument = nextDocument;
    mobilePdfPageNumber = 1;
    await renderMobilePdfPage(1, version);
}

function showDesktopPdfPreview() {
    const iframe = document.getElementById("preview");
    const mobilePreview = document.getElementById("mobilePdfPreview");

    mobilePreview.hidden = true;
    iframe.hidden = false;
    iframe.src = `${currentPdfUrl}#page=1&zoom=page-width&toolbar=1`;
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

        if (mobilePreviewQuery.matches) {
            try {
                await showMobilePdfPreview(blob, version);
                if (version === renderVersion) status.hidden = true;
            } catch (previewError) {
                console.error("Unable to show the mobile PDF preview:", previewError);
                status.textContent = "Preview unavailable on this phone. Download still works.";
            }
        } else {
            preview.addEventListener("load", () => {
                status.hidden = true;
            }, { once: true });
            showDesktopPdfPreview();
        }

        return blob;
    } catch (error) {
        console.error("Unable to build the pattern PDF:", error);
        status.textContent = "Preview unavailable. Check the browser console for details.";
        return null;
    }
}

function schedulePreviewUpdate() {
    clearTimeout(previewTimer);
    updateYarnEstimateOutput();
    const status = document.getElementById("previewStatus");
    status.hidden = false;
    status.textContent = "Updating pages…";
    previewTimer = setTimeout(updatePreview, 350);
}

function updateYarnEstimateOutput() {
    const yarnOutput = document.getElementById("yarnEstimateOutput");
    const lengthWarning = document.getElementById("finishedLengthWarning");
    const values = calculatePattern(getInputs());

    lengthWarning.hidden = values.hasValidFinishedLength;
    lengthWarning.textContent = values.hasValidFinishedLength
        ? ""
        : `This length is too short. It must be at least ${values.minimumFinishedLengthCm} cm—half your armhole measurement plus 2.5 cm.`;

    yarnOutput.textContent = !values.hasValidFinishedLength
        ? "Correct the finished-length measurement to calculate the project yardage."
        : values.estimatedYarnMeters > 0
            ? `Estimated project yarn: ${values.estimatedYarnMeters} m / ${values.estimatedYarnYards} yd`
            : "Enter the yarn used in your swatch to estimate the project yardage.";
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
    "finishedLengthCm",
    "gaugeAcrossSts",
    "gaugeAcrossCm",
    "gaugeDownRows",
    "gaugeDownCm",
    "swatchYarnLength",
    "swatchYarnUnit"
].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        element.addEventListener("input", schedulePreviewUpdate);
    }
});

document.getElementById("downloadBtn").addEventListener("click", downloadPDF);

document.getElementById("previousPdfPage").addEventListener("click", () => {
    renderMobilePdfPage(mobilePdfPageNumber - 1);
});

document.getElementById("nextPdfPage").addEventListener("click", () => {
    renderMobilePdfPage(mobilePdfPageNumber + 1);
});

const mobilePdfCanvas = document.getElementById("mobilePdfCanvas");

mobilePdfCanvas.addEventListener("touchstart", event => {
    mobileSwipeStartX = event.changedTouches[0]?.clientX ?? null;
}, { passive: true });

mobilePdfCanvas.addEventListener("touchend", event => {
    if (mobileSwipeStartX === null) return;

    const endX = event.changedTouches[0]?.clientX ?? mobileSwipeStartX;
    const distance = endX - mobileSwipeStartX;
    mobileSwipeStartX = null;

    if (Math.abs(distance) < 45) return;
    renderMobilePdfPage(mobilePdfPageNumber + (distance < 0 ? 1 : -1));
}, { passive: true });

const handlePreviewModeChange = () => {
    if (currentPdfBlob) updatePreview();
};

if (mobilePreviewQuery.addEventListener) {
    mobilePreviewQuery.addEventListener("change", handlePreviewModeChange);
} else {
    mobilePreviewQuery.addListener(handlePreviewModeChange);
}

window.addEventListener("beforeunload", () => {
    if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
    mobilePdfDocument?.destroy();
});

updateYarnEstimateOutput();
loadPatternTemplate();

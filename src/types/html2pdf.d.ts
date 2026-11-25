declare module 'html2pdf.js' {
  export interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: 'jpeg' | 'png' | 'webp'; quality?: number };
    enableLinks?: boolean;
    html2canvas?: any;
    jsPDF?: any;
    pagebreak?: { mode?: string | string[]; before?: string | string[]; after?: string | string[]; avoid?: string | string[] };
  }

  export interface Html2PdfChain {
    set(options: Html2PdfOptions): Html2PdfChain;
    from(element: HTMLElement | string): Html2PdfChain;
    save(filename?: string): Promise<void>;
    outputPdf(type?: string, params?: any): Promise<any>;
    toContainer(): Html2PdfChain;
    toCanvas(): Html2PdfChain;
    toImg(): Html2PdfChain;
    toPdf(): Html2PdfChain;
  }

  function html2pdf(): Html2PdfChain;
  function html2pdf(element: HTMLElement | string, options?: Html2PdfOptions): Html2PdfChain;

  export default html2pdf;
}

export const COMPANY_INFO = {
    name: 'TMR TRADING LANKA (PVT) LIMITED',
    branch: 'AUTHORIZED DEALER – EMBILIPITIYA',
    address: '',
    phone: '',
    email: '',
    rmv_charge: 13000
};

export const PDF_SETTINGS = {
    pageSize: 'A4',
    margin: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40
    },
    defaultFont: 'Helvetica',
    defaultFontSize: 12
};

export const SIGNATURE_SETTINGS = {
    defaultPosition: {
        x: 50,
        y: 50,
        width: 200,
        height: 100
    },
    timestampServer: 'http://timestamp.digicert.com',
    crlServer: 'http://crl.digicert.com'
};

export const BRANDING_CONFIG = {
    colors: {
        primary: '#000000',
        secondary: '#333333',
        text: '#000000',
        background: '#ffffff'
    },
    fonts: {
        primary: {
            regular: 'Roboto-Regular.ttf',
            bold: 'Roboto-Bold.ttf'
        },
        secondary: {
            regular: 'OpenSans-Regular.ttf',
            bold: 'OpenSans-Bold.ttf'
        }
    },
    typography: {
        heading: {
            lineHeight: 1.2,
            letterSpacing: 0,
            wordSpacing: 0
        },
        body: {
            lineHeight: 1.5,
            letterSpacing: 0,
            wordSpacing: 0
        },
        table: {
            lineHeight: 1.4,
            letterSpacing: 0,
            wordSpacing: 0
        }
    }
};

export const CORS_ORIGIN = process.env.NODE_ENV === 'production' 
  ? 'https://your-app-name.pages.dev'  // Replace with your Cloudflare Pages domain
  : 'http://localhost:5173'; 
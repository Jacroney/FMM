# KSig Treasurer – Fraternity Finance Management

KSig Treasurer is a web-based tool designed to help fraternity treasurers efficiently manage chapter finances. Built with React and Vite, this application provides an intuitive interface to handle budgeting, asset tracking, and financial reporting, tailored specifically for fraternal organizations.

## Purpose

The primary goal of KSig Treasurer is to simplify the financial responsibilities of fraternity treasurers by offering centralized management of budgets, assets, and transactions in one modern, user-friendly dashboard.

## Key Features

- **Budget Management:**  
  Create, view, and adjust budgets for different categories and time periods to ensure financial health and accountability.

- **Asset Consolidation:**  
  Track and consolidate chapter assets, including bank balances, funds, and other financial resources, for a clear overview of fraternity wealth.

- **Transaction Tracking:**  
  Record income and expenses, and view detailed transaction history for transparency and reporting.

- **Financial Reports:**  
  Generate reports to analyze spending, income, and budget adherence, supporting informed decision-making and chapter accountability.

- **User Settings:**  
  Flexible settings for personalizing the experience and configuring chapter-specific financial needs.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Jacroney/FMM.git
   cd FMM
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Create your environment file:**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your Supabase credentials and optional feature flags in `.env.local`.

4. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser to the provided local URL (usually `http://localhost:5173/`).

### Build for Production

To create an optimized production build:

```bash
npm run build
# or
yarn build
```

You can preview the production build locally with:

```bash
npm run preview
# or
yarn preview
```

## Technologies Used

- **Frontend:** React, React Router, TailwindCSS
- **Build Tool:** Vite
- **State Management:** Context API (FinancialProvider)
- **Data Handling:** Formik, Yup (forms & validation), PapaParse (CSV data), Axios (API requests)
- **Environment:** Vite-powered env vars (`.env.local`)
- **Icons & UI:** HeadlessUI, Heroicons

## Folder Structure

- `src/pages/` – Main application pages (Dashboard, Transactions, Budgets, Reports, Settings)
- `src/components/` – Reusable UI components
- `src/context/` – Financial data context and providers
- `src/layouts/` – Main layout shell for navigation and page display

## Contributing

Pull requests and suggestions are welcome! If you have ideas for features or improvements, please open an issue or submit a PR.

## License

This project is private to Jacroney and collaborators.

---

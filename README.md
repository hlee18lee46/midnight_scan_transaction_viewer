# 🌙 Midnight Scan – Transaction Viewer

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

Submission for the **Midnight Network "Privacy First" Challenge** — *Enhance the Ecosystem* prompt.

---

## 🚀 What I Built
**Midnight Scan** is a lightweight, open-source web explorer for the **Midnight testnet**.  
It helps developers quickly verify and debug their transactions by providing an easy-to-use **transaction search** and **recent activity feed**.

- 🔍 **Search by Tx ID** → fetch transaction details from the Midnight GraphQL indexer  
- 📜 **Recent Transactions** toggle → shows the 15 most recent indexed transactions  
- 🌐 **Zero-install preview** → live and deployed on Vercel  
- 🛠 Built with **React + Vite + TypeScript + Tailwind CSS**

👉 **Live site**: [https://midnight-scan-transaction-viewer.vercel.app/](https://midnight-scan-transaction-viewer.vercel.app/)

---

## 🎥 Demo
1. Request **tDUST** from the official faucet (easy way to generate a test transaction).  
2. Copy the transaction ID from your wallet.  
3. Paste it into **Midnight Scan** → press **Search**.  
4. Or flip the **Recent** toggle to see the latest 15 transactions.  

---

## 🔧 How I Used Midnight’s Technology
Midnight Scan integrates with the **Midnight GraphQL Indexer**.  
The app runs two core queries:

**Recent Transactions**
```graphql
query RecentTransactions {
  recentTransactions(limit: 15) {
    id
    timestamp
    status
    fee
    blockHeight
  }
}
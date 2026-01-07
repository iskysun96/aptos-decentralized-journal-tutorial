# Decentralized Journal Tutorial Template

A starter template for building a decentralized journal application on Aptos. This template includes all the UI components and styling, but the smart contract and blockchain integration logic are left for you to implement while following along with the tutorial video.

## 📺 Tutorial Video

Follow along with the tutorial video to learn how to:
- Build and publish a Move smart contract on Aptos
- Implement entry functions for adding and deleting journal entries
- Create view functions to query blockchain data
- Integrate wallet connection and transaction submission
- Build a complete full-stack decentralized application

**[Link to tutorial video will be added here]**

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- An Aptos wallet (Petra, Pontem, or other compatible wallet)
- Aptos CLI (optional, for contract development)

### Clone the Repository

```bash
git clone <repository-url>
cd aptos-decentralized-journal-tutorial
```

### Install Dependencies

```bash
npm install
# or
pnpm install
```

### Set Up Environment Variables

1. Initialize an Aptos account
```bash
aptos init
```
Choose `devnet` to begin with. This step will create a folder named `.aptos` which holds the initialized account info in the `config.yaml` file.

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Open `.env` and configure the following variables:

```env
# Network: "devnet", "testnet" or "mainnet"
NEXT_PUBLIC_APP_NETWORK=testnet

# Module Address: Set this after publishing your smart contract
NEXT_PUBLIC_MODULE_ADDRESS=

# Copy over the address from the `./aptos/config.yaml` file
NEXT_MODULE_PUBLISHER_ACCOUNT_ADDRESS=

# This is the module publisher account's private key. Be cautious about who you share it with, and ensure it is not exposed when deploying your dApp.
# Copy over the address from the `./aptos/config.yaml` file
NEXT_MODULE_PUBLISHER_ACCOUNT_PRIVATE_KEY=

# Aptos API Key (Optional): Get from https://build.aptoslabs.com/
NEXT_PUBLIC_APTOS_API_KEY=

# GraphQL Endpoint (Optional): For faster data queries
NEXT_PUBLIC_GRAPHQL_ENDPOINT=

# GraphQL API Key (Optional)
NEXT_PUBLIC_GRAPHQL_API_KEY=
```

**Note:** You'll fill in `NEXT_PUBLIC_MODULE_ADDRESS` after publishing your smart contract during the tutorial.

### Run the Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📚 What You'll Build

During the tutorial, you'll implement:

### Smart Contract (Move)
- Struct definitions for journal entries
- Entry functions: `add_daily_entry`, `delete_daily_entry_by_unixtimestamp`
- View functions: `get_journal_object_address`, `get_journal_content_by_date`
- Helper functions and error handling

### Frontend
- Wallet connection integration
- Transaction submission for adding entries
- Transaction submission for deleting entries
- Blockchain data queries to fetch journal entries
- GraphQL integration (optional, for performance)

## 🏗️ Project Structure

```
decentralized-journal-tutorial/
├── contract/                 # Move smart contract
│   ├── sources/             # Contract source files
│   └── tests/               # Contract tests
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── page.tsx         # Write journal entry page
│   │   └── view/            # View journal entries page
│   ├── components/          # React components
│   ├── entry-functions/     # Transaction builders (TODO)
│   ├── view-functions/       # Blockchain queries (TODO)
│   └── utils/               # Utility functions
├── scripts/move/            # Move contract scripts
└── .env.example            # Environment variables template
```

## 🛠️ Available Scripts

### Frontend Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Move Contract
- `npm run move:compile` - Compile the Move contract
- `npm run move:test` - Run Move unit tests
- `npm run move:publish` - Publish the contract to Aptos
- `npm run move:upgrade` - Upgrade an existing contract

## 📝 Tutorial Checklist

As you follow along with the tutorial video, you'll complete:

- [ ] Set up Aptos development environment
- [ ] Implement Move smart contract structs
- [ ] Implement entry functions (add/delete entries)
- [ ] Implement view functions (query entries)
- [ ] Publish the smart contract
- [ ] Set `NEXT_PUBLIC_MODULE_ADDRESS` in `.env`
- [ ] Implement `addDailyEntry` transaction builder
- [ ] Implement `deleteDailyEntry` transaction builder
- [ ] Implement `getJournalEntries` view function
- [ ] Connect wallet adapter in frontend
- [ ] Integrate transaction submission
- [ ] Test the complete application

## 🎨 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Blockchain:** Aptos
- **Wallet:** Aptos Wallet Adapter
- **Language:** TypeScript
- **Smart Contracts:** Move
- **State Management:** React Query (TanStack Query)

## 📖 Resources

- [Aptos Documentation](https://aptos.dev/)
- [Move Language Documentation](https://move-language.github.io/move/)
- [Aptos TypeScript SDK](https://aptos-labs.github.io/ts-sdk-doc/)
- [Aptos Wallet Adapter](https://github.com/aptos-labs/aptos-wallet-adapter)
- [Aptos Build](https://build.aptoslabs.com/) - Get API keys

## 🤝 Following Along

1. **Clone the repository** (you're here!)
2. **Install dependencies** using `npm install` or `pnpm install`
3. **Set up environment variables** by copying `.env.example` to `.env`
4. **Start the dev server** with `npm run dev`
5. **Open the tutorial video** and follow along step by step
6. **Implement the TODO items** as shown in the video
7. **Test your implementation** after each step

## 💡 Tips

- The UI is already complete - focus on implementing the blockchain logic
- All TODO comments in the code indicate where you need to add implementation
- Use the Aptos testnet for development (it's free!)
- Keep your `.env` file secure and never commit it to version control
- Test your contract thoroughly before deploying to mainnet

## 📄 License

[Add your license information here]

---

**Happy Building! 🚀**

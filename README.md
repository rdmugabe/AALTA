# AALTA - Arizona Assisted Living Transparency Authority

Independent compliance intelligence platform providing transparency into Arizona assisted living facilities through public regulatory data.

## Project Structure

```
aalta/
├── apps/
│   ├── web/                    # Next.js 14 frontend
│   ├── api/                    # Node.js + tRPC backend
│   └── admin/                  # Admin dashboard (Phase 3)
├── packages/
│   ├── shared/                 # Shared types, utils, constants
│   ├── ui/                     # Component library
│   └── scoring/                # Compliance scoring engine
├── infrastructure/
│   └── terraform/              # AWS infrastructure as code
├── docs/                       # Documentation
└── scripts/                    # Deployment scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Local Development Setup

1. **Clone and install dependencies:**
   ```bash
   cd aalta
   npm install
   ```

2. **Start infrastructure services:**
   ```bash
   docker-compose up -d postgres redis meilisearch
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Initialize the database:**
   ```bash
   cd apps/api
   npx prisma db push
   npx prisma db seed
   ```

5. **Start development servers:**
   ```bash
   # From root directory
   npm run dev
   ```

   This will start:
   - Web app: http://localhost:3001
   - API server: http://localhost:4000

## Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) |
| Backend | Node.js + tRPC |
| Database | PostgreSQL 16 |
| Search | Meilisearch |
| Cache | Redis |
| Queue | BullMQ |
| Hosting | AWS (ECS, RDS, CloudFront) |

### Key Features

- **Facility Search**: Search and filter Arizona assisted living facilities
- **Compliance Scores**: Data-driven scoring based on inspection and violation data
- **Violation History**: Complete violation and inspection history for each facility
- **Risk Assessment**: Risk level classification (Low, Moderate, High, Critical)
- **Trend Analysis**: Track facility compliance over time

## Database Schema

The database includes the following main entities:

- `Facility` - Core facility information
- `Violation` - Regulatory violations
- `Inspection` - Inspection records
- `Complaint` - Filed complaints
- `Document` - PDFs and documents
- `ScoringHistory` - Score calculations over time
- `User` - User accounts and roles

## Scoring Algorithm

The compliance score (0-100) is calculated based on:

| Factor | Weight |
|--------|--------|
| Violation History | 50% |
| Complaint Ratio | 20% |
| Improvement Trajectory | 20% |
| Stability | 10% |

See `/methodology` page for full details.

## Deployment

### Using Docker

```bash
# Build and run production containers
docker-compose --profile production up -d
```

### Using Terraform (AWS)

```bash
cd infrastructure/terraform/environments/dev
terraform init
terraform plan
terraform apply
```

## API Endpoints

The API uses tRPC. Main routers:

- `facility.list` - List facilities with filters
- `facility.getBySlug` - Get facility details
- `facility.getViolations` - Get facility violations
- `facility.getStats` - Get aggregate statistics
- `search.quickSearch` - Autocomplete search
- `search.fullSearch` - Full-text search

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary - All rights reserved.

## Contact

- Website: https://aalta.org
- Email: transparency@aalta.org

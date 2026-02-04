# Pavement LCA & LCCA Tool

This project is a React application for performing Life Cycle Cost Analysis (LCCA) and Life Cycle Assessment (LCA) for pavement management.

## Project Structure

- `src/App.jsx`: Main application logic (migrated from `pavement-lcca-v2.jsx`).
- `src/main.jsx`: Entry point.
- `vite.config.js`: Configuration for Vite build tool.
- `tailwind.config.js`: Tailwind CSS configuration.
- `Dockerfile`: Multi-stage Docker build for deployment.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Deployment to Google Cloud Run

### Option 1: Deploy from Source (recommended)

You can deploy directly from your source code using Google Cloud Build.

1. Authenticate with Google Cloud:
   ```bash
   gcloud auth login
   ```

2. Set your project ID:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy pavement-lcca --source . --region us-central1 --allow-unauthenticated
   ```

### Option 2: Build and Deploy Container

1. Build the image:
   ```bash
   docker build -t gcr.io/YOUR_PROJECT_ID/pavement-lcca .
   ```

2. Push the image:
   ```bash
   docker push gcr.io/YOUR_PROJECT_ID/pavement-lcca
   ```

3. Deploy:
   ```bash
   gcloud run deploy pavement-lcca --image gcr.io/YOUR_PROJECT_ID/pavement-lcca --platform managed --region us-central1 --allow-unauthenticated
   ```

## Deployment via GitHub

1. Push this repository to GitHub.
2. Connect your repository to Google Cloud Run via the Google Cloud Console "Continuous Deployment" feature.
   - Go to Cloud Run > Create Service.
   - Select "Continuously deploy new revisions from a source repository".
   - Connect your GitHub repo `Pavement_LCA_LCCA`.
   - Google Cloud Build will automatically build the `Dockerfile` and deploy it on every push.

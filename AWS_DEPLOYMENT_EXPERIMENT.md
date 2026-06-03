# AWS Deployment Experiment Guide

## Overview

This guide outlines an experimental deployment plan for hosting the Samsa application on Amazon Web Services (AWS). It covers deploying the React (Vite) frontend, Node.js/Express backend, and PostgreSQL database using managed AWS services.

## Architecture

*   **Frontend**: AWS Amplify (or S3 + CloudFront)
*   **Backend**: AWS App Runner (or Elastic Beanstalk / ECS)
*   **Database**: Amazon RDS for PostgreSQL
*   **Auth**: Continue using existing Supabase project, or migrate if required later.

## Prerequisites

1.  An active [AWS Account](https://aws.amazon.com/).
2.  [AWS CLI](https://aws.amazon.com/cli/) installed and configured (`aws configure`).
3.  Source code pushed to a GitHub repository.

---

## Step 1: Database Setup (Amazon RDS)

We need a persistent PostgreSQL database for backend data.

1.  Navigate to **Amazon RDS** in the AWS Console.
2.  Click **Create database**.
3.  Select **Standard create** and choose **PostgreSQL**.
4.  Choose the **Free tier** template for the experiment.
5.  Set the DB instance identifier (e.g., `samsa-db`).
6.  Set the Master username (e.g., `postgres`) and a strong password.
7.  Under **Connectivity**, ensure **Public access** is set to **Yes** (or configure VPC peering if keeping it private, but public is easier for a quick test if IP restricted).
8.  Create the database and wait for it to be available.
9.  Copy the **Endpoint** and construct your `DATABASE_URL`:
    `postgresql://postgres:[PASSWORD]@[ENDPOINT]:5432/postgres`

---

## Step 2: Backend Deployment (AWS App Runner)

AWS App Runner is the easiest way to deploy a containerized or source-code-based Node.js application.

1.  Navigate to **AWS App Runner**.
2.  Click **Create an App Runner service**.
3.  **Source**:
    *   Choose **Source code repository** and connect your GitHub account.
    *   Select the `Samsa` repository and the relevant branch.
4.  **Configuration**:
    *   Runtime: Node.js 18 (or your version).
    *   Build command: `npm install`
    *   Start command: `npm start`
    *   Port: `3001` (or whatever your `server.js` uses).
5.  **Environment Variables**:
    Add the necessary secrets from your `.env`:
    *   `DATABASE_URL` (from Step 1)
    *   `SUPABASE_URL`
    *   `SUPABASE_ANON_KEY`
    *   `STRIPE_SECRET_KEY`
    *   `NODE_ENV=production`
6.  Create and deploy the service.
7.  Once deployed, copy the **Default domain** URL (e.g., `https://xxxxxx.us-east-1.awsapprunner.com`). This is your new `VITE_API_URL`.

*(Alternative: Elastic Beanstalk is also a viable option if you prefer EC2-based deployments over container-like services).*

---

## Step 3: Frontend Deployment (AWS Amplify)

AWS Amplify provides a seamless experience for deploying modern web apps like React/Vite.

1.  Navigate to **AWS Amplify** in the AWS Console.
2.  Click **New app** -> **Host web app**.
3.  Connect your GitHub repository and select the `Samsa` repo.
4.  **Build Settings**:
    Amplify should auto-detect the Vite build. Ensure the settings handle the subfolder properly (you may need to tweak the build YAML to run `npm install` and `npm run build` in the `frontend` folder).
5.  **Environment variables**:
    Add the following variables in the Amplify console:
    *   `VITE_API_URL` (The App Runner URL from Step 2)
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_ANON_KEY`
    *   `VITE_STRIPE_PUBLISHABLE_KEY`
6.  Deploy the app.
7.  Once finished, Amplify will provide a public URL for your frontend.

## Step 4: Verification & Testing

1.  Open the Amplify frontend URL in your browser.
2.  Open the Network tab / Console in Developer Tools.
3.  Verify that API requests are successfully hitting your App Runner backend URL.
4.  Test placing a prediction to verify database connectivity on RDS.
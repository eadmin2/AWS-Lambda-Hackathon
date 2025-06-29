# VA Rating Assistant - Built with Bolt.new & AWS Lambda 🚀

---

## 🎯 Inspiration

As an active-duty Navy Chief and advocate for veterans' welfare, I created **VA Rating Assistant** to help veterans navigate the confusing, time-consuming VA disability claims process. The goal: **Use AI and serverless technology to deliver fast, clear, and actionable disability rating estimates**—all through a modern, accessible web interface built in **Bolt.new**.

---

## 📌 Project Overview

**VA Rating Assistant** is a web-based application that allows veterans to upload their medical documents and receive **AI-powered VA disability rating estimates**. The platform also offers tools for **pre-filling VA forms**, **finding nearby VA facilities**, and **tracking conditions over time**.

- **Frontend:** Built entirely in **Bolt.new (React + TypeScript)**.
- **Backend:** Fully serverless, running on **AWS Lambda**, with integrations to **S3**, **Textract**, **Bedrock**, **SQS**, **SNS**, **API Gateway**, and **X-Ray**.

---

## 🛠️ Technologies Used

### Frontend (Built Entirely in Bolt.new)

| Tool | Purpose |
|---|---|
| **Bolt.new (React + TypeScript)** | Full user interface, state management, routing, and API consumption |
| **Built with Bolt Badge** | Displayed proudly on the deployed site |

---

### Backend (AWS Services)

| AWS Service | Purpose |
|---|---|
| **AWS Lambda** | Core serverless compute for all backend functions |
| **Amazon API Gateway** | Public API layer for Bolt frontend to connect with Lambda functions |
| **Amazon S3** | Secure storage for uploaded medical documents |
| **Amazon Textract** | OCR for text and data extraction from PDFs and images |
| **Amazon Bedrock + Bedrock Agent** | AI and RAG-driven disability condition analysis |
| **Amazon SQS / SNS** | Asynchronous event handling for large document jobs |
| **Supabase (Powered by AWS)** | User authentication and authorization |
| **AWS X-Ray** | Distributed tracing and backend monitoring |

---

## ✅ How I Used AWS Lambda

**AWS Lambda is the core backend engine of VA Rating Assistant.**  

Here's how Lambda fits in:

1. **API Endpoints:**  
Every backend feature—document upload processing, Textract calls, Bedrock AI triggers, condition mapping—is executed within AWS Lambda functions, triggered via **Amazon API Gateway**.

2. **Event-Driven Workflows:**  
When users upload documents from the Bolt frontend, S3 events trigger **Lambda** functions for **Textract processing** and **AI analysis**.

3. **AI Workflow Orchestration:**  
Lambda functions coordinate between **Textract**, **Bedrock**, and **Supabase** for extracting, analyzing, and saving disability-related data.

4. **Scalable and Stateless:**  
All Lambda functions run in a fully stateless, scalable manner, perfectly aligned with the **serverless-first architecture** of this project.

---

## 🧩 How AWS Lambda Functions Work & What Triggers Them

The VA Rating Assistant backend is powered by a set of AWS Lambda functions, each designed to handle a specific part of the document processing and AI analysis workflow. Here's a detailed breakdown of how these Lambdas operate and what triggers them:

### Lambda Triggers & Event Sources

- **Amazon API Gateway (REST & WebSocket):**
  - **Trigger:** HTTP requests from the frontend (e.g., document upload, status check, user actions) and WebSocket connections for real-time updates.
  - **Purpose:** Initiates Lambda functions for processing uploads, registering sessions, and broadcasting results.

- **Amazon S3 (ObjectCreated Event):**
  - **Trigger:** When a user uploads a document to S3 using a pre-signed URL, the S3 bucket emits an ObjectCreated event.
  - **Purpose:** Triggers a Lambda to start the OCR and AI analysis pipeline.

- **Amazon SNS/SQS:**
  - **Trigger:** Asynchronous events for large or long-running document jobs, or to notify other services of processing stages.
  - **Purpose:** Decouples heavy processing and enables scalable, event-driven workflows.

### Lambda Workflow & Orchestration

1. **Document Upload Initiation:**
   - User uploads a document via the frontend, which is stored in S3.
   - S3 triggers a Lambda function to begin processing.

2. **OCR Processing:**
   - The triggered Lambda calls Amazon Textract to extract text and data from the uploaded document.
   - Results are stored in S3 and/or passed to the next Lambda.

3. **AI Analysis:**
   - Another Lambda function invokes Amazon Bedrock (Claude) to analyze the extracted text and generate a summary or rating estimate.
   - The summary is saved back to S3.

4. **Status & Notification:**
   - Lambdas update user status and job progress in Supabase.
   - For real-time updates, a Lambda sends messages via API Gateway WebSocket to notify the frontend when processing is complete.
   - SNS/SQS may be used to queue and manage large jobs or notifications.

5. **Result Retrieval:**
   - The frontend polls or receives a WebSocket message when the summary is ready, and retrieves the result from S3 or via an API endpoint.

### Key Points
- All Lambdas are stateless and event-driven, scaling automatically with demand.
- Triggers include API Gateway (REST/WebSocket), S3 ObjectCreated events, and SNS/SQS messages.
- Lambdas orchestrate the full workflow: from upload, through OCR and AI, to user notification and result delivery.
- Monitoring and tracing are handled by AWS X-Ray for all Lambda executions.

---

## ✅ AWS Tools Used

| AWS Service | Purpose |
|---|---|
| **AWS Lambda** | Serverless compute for all backend processes |
| **Amazon API Gateway** | Connects Bolt frontend with backend Lambdas |
| **Amazon S3** | Document storage |
| **Amazon Textract** | OCR and data extraction |
| **Amazon Bedrock + Bedrock Agent** | Generative AI and RAG |
| **Amazon SQS / SNS** | Async event handling |
| **Amazon Supabase (Powered by AWS)** | User authentication |
| **AWS X-Ray** | Backend tracing |

---

## 🚧 Challenges I Overcame

- **Document Variability:**  
Dealing with a wide range of file types (PDFs, scanned images, handwritten notes).

- **AI Accuracy:**  
Tuning **Bedrock RAG workflows** to align extracted medical conditions with **38 CFR VA disability rating criteria**.

- **Scaling for Large Documents:**  
Using **SQS/SNS** and **chunked Lambda workflows** to process large uploads without timeouts.

- **User Trust & Security:**  
Implementing **end-to-end encryption** and adhering to **HIPAA-conscious practices** for sensitive veteran data.

---

## 🏆 Accomplishments

- **Built Entire Frontend in Bolt.new:**  
From wireframes to production, Bolt was the core platform for all user-facing pages, state management, and API interactions.

- **Fully Serverless Backend:**  
Every backend component runs on **AWS Lambda**, triggered by **API Gateway**, **S3 Events**, and **SQS/SNS pipelines**.

- **AI-Powered Disability Rating Estimator:**  
Using **Textract**, **Bedrock**, and **custom RAG agents** to map medical findings to VA rating estimates.

---

## 🚀 What's Next

- **Public Launch:**  
Go live at [https://www.varatingassistant.com](https://www.varatingassistant.com).

- **Deeper VA API Integration:**  
Pull live service history and claim data directly into the Bolt frontend.

- **Auto-Filled VA Forms:**  
Generate pre-filled **VA disability forms (21-526EZ and more)**.

- **AI Appeals Helper:**  
Help veterans understand their ratings and guide them through the appeals process.

---

## 📽️ Demo Video

[Watch on YouTube](https://www.youtube.com/watch?v=RGmAZSE2vqQ)  
(3-minute demo showing **Bolt UI**, **AWS Lambda execution**, and **end-to-end user flow**)

---

## ✅ Submission Notes (For Hackathon Review)

- **Frontend:** 100% built in **Bolt.new**
- **Backend:** AWS Lambda (with required API Gateway triggers and S3/Lambda event triggers)
- **AWS Integration:** Uses over **7+ AWS services**
- **Significant Updates:** All core features and UI were built from scratch in Bolt during the Hackathon period.
- **Third-Party APIs:** Uses **VA.gov public APIs (planned for production launch)** and **Supabase for Postgres storage**.

---

## 🔗 Live Link

[https://www.varatingassistant.com](https://www.varatingassistant.com)

---

## 📂 License

This project is not for cloning and should not be forked.

---

## 🚀 Demo Login & Test Instructions

To explore the app quickly, use the following demo credentials:

**Login Credentials:**
- **Email:** support@varatingassistant.com
- **Password:** demo123!@

This account already has a sample medical document uploaded. You can also create your own account if you wish.

**Stripe Test Card for Orders:**
- **Card Number:** 4242 4242 4242 4242
- **Expiration:** 12/28
- **CVC:** 123
- **Name:** John Doe
- **ZIP:** 12345
- Uncheck "Save my information"
- Click "Pay"

---

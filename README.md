# AWS EC2 CI/CD Deployment Pipeline

## Project Overview

This project demonstrates an automated CI/CD pipeline for deploying a web-based application dashboard to an Amazon EC2 instance using AWS CodeDeploy and AWS CodePipeline.

The application is built with HTML, CSS, and JavaScript, with GitHub serving as the source code repository. AWS CodePipeline automates the deployment workflow, while AWS CodeDeploy manages application deployments to the EC2 instance.

## Technologies Used

- **Frontend:** HTML, CSS, JavaScript
- **Version Control:** Git and GitHub
- **Cloud Platform:** Amazon Web Services (AWS)
- **Compute Service:** Amazon EC2
- **Deployment Automation:** AWS CodeDeploy
- **CI/CD Pipeline:** AWS CodePipeline
- **Operating System:** Windows for local development

## Architecture

The project follows an automated GitHub-to-AWS deployment workflow:

**Developer → GitHub → AWS CodePipeline → AWS CodeDeploy → Amazon EC2**

When application changes are pushed to GitHub, the pipeline retrieves the latest source revision and initiates the deployment process through CodeDeploy. The application is then deployed to the target EC2 instance and verified in the browser.

## Project Structure

```text
aws-ec2-cicd-project/
├── index.html
├── style.css
├── script.js
├── appspec.yml
└─ README.md
```

The application files provide the dashboard interface and client-side functionality. The `appspec.yml` file defines the deployment instructions used by AWS CodeDeploy.

## Key Features

- Responsive web-based application dashboard.
- Version-controlled source code hosted on GitHub.
- Automated source retrieval through AWS CodePipeline.
- Application deployment managed by AWS CodeDeploy.
- EC2-based application hosting.
- Repeatable deployment workflow for application updates.
- Cloud deployment troubleshooting and validation.

## Implementation Steps

### 1. Application Development

Developed the application dashboard using HTML, CSS, and JavaScript in a local Windows environment.

### 2. GitHub Integration

Initialized Git version control, committed the application files, and pushed the source code to a GitHub repository.

### 3. Amazon EC2 Configuration

Prepared an EC2 instance to host the application and configured the required network access and deployment permissions.

### 4. AWS CodeDeploy Configuration

Configured the CodeDeploy application and deployment group to manage application releases to the EC2 instance.

### 5. AWS CodePipeline Configuration

Created a pipeline connecting the GitHub source stage with the deployment stage to automate application updates.

### 6. Deployment Validation

Validated the deployment workflow by checking pipeline execution, deployment status, and application accessibility through a web browser.

## Learning Outcomes

- Practical understanding of AWS cloud infrastructure.
- Git and GitHub source control workflows.
- EC2 instance configuration and application hosting.
- IAM roles and permissions for AWS services.
- CodeDeploy application revisions and deployment groups.
- CodePipeline source and deployment stages.
- CI/CD automation, troubleshooting, and deployment verification.

## Conclusion

This project demonstrates how a web application can be integrated with AWS services to establish an automated deployment workflow. It combines source control, cloud computing, and deployment automation to provide practical experience with foundational Cloud and DevOps engineering concepts.

## Author

**Saad Hassan Qureshi**

- **GitHub:** [saadqureshiiiii](https://github.com/saadqureshiiiii)
- **Portfolio:** [saadsystems.me](https://www.saadsystems.me/)

---

*Project focus: AWS Cloud Computing, CI/CD Automation, and DevOps Engineering.*

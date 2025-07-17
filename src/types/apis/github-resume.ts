export interface Resume {
  user: {
    id: string;
    username: string;
  };
  resume: {
    id: string;
    originalUrl: string;
    parsedData: {
      personalInfo: {
        name: string;
        email: string;
        phone: string;
        location: string;
        linkedIn: string;
        github: string;
      };
      summary: string;
      experience: {
        company: string;
        position: string;
        duration: string;
        responsibilities: string[];
      }[];
      education: {
        institution: string;
        degree: string;
        duration: string;
        gpa: string;
      }[];
      skills: {
        technical: string[];
        languages: string[];
        tools: string[];
      };
      projects: {
        name: string;
        description: string;
        technologies: string[];
        achievements: string[];
      }[];
    };
    uploadedAt: string;
  };
}

export interface ResumeList {
  id: string;
  originalUrl: string;
  resumeName: string;
  uploadedAt: string;
  createdAt: string;
}

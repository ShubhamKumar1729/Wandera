const express = require("express");
const router = express.Router();

const pages = {
  about: {
    pageTitle: "About Us | Wandera",
    badge: "Company",
    title: "Building Better Travel Discovery",
    subtitle:
      "Wandera helps travelers discover verified destinations, compare options quickly, and plan with confidence.",
    highlights: [
      "Mission-driven destination platform",
      "Verified community submissions",
      "Designed for budget-aware travelers"
    ],
    sections: [
      {
        heading: "Who We Are",
        body:
          "We are a travel product team focused on making destination discovery simpler and more trustworthy. Our goal is to help people spend less time searching and more time traveling."
      },
      {
        heading: "What We Value",
        body:
          "Clarity, safety, and authenticity. Every product decision is guided by user trust, practical utility, and transparent information."
      },
      {
        heading: "How Wandera Works",
        body:
          "Users explore destinations by budget and category, save favorites, and contribute destination insights for the community."
      }
    ],
    cta: { label: "Explore Destinations", href: "/listings" }
  },
  careers: {
    pageTitle: "Careers | Wandera",
    badge: "Careers",
    title: "Join The Wandera Team",
    subtitle:
      "We are building tools that make travel planning smarter and more human-centered.",
    highlights: [
      "Remote-friendly culture",
      "Ownership and autonomy",
      "Impactful product challenges"
    ],
    sections: [
      {
        heading: "Why Work Here",
        body:
          "You will work on meaningful features used by real travelers. We value thoughtful execution, strong collaboration, and continuous learning."
      },
      {
        heading: "Open Roles",
        body:
          "We regularly hire for product engineering, design, growth, and support. Send your profile and portfolio to careers@wandera.com."
      },
      {
        heading: "Hiring Process",
        body:
          "Our process includes an intro call, role-specific interview rounds, and a collaborative final conversation focused on practical problem solving."
      }
    ],
    cta: { label: "Send Your Profile", href: "mailto:careers@wandera.com" }
  },
  blog: {
    pageTitle: "Blog | Wandera",
    badge: "Insights",
    title: "Travel Stories, Tips, And Product Updates",
    subtitle:
      "Read practical travel planning guides and the latest updates from the Wandera team.",
    highlights: [
      "Destination deep dives",
      "Budget planning checklists",
      "Product release notes"
    ],
    sections: [
      {
        heading: "Popular Topics",
        body:
          "Weekend destination guides, safety-first planning, route planning, and smart budget techniques for every traveler type."
      },
      {
        heading: "Editorial Focus",
        body:
          "Useful, actionable content. We avoid fluff and prioritize practical insights travelers can use immediately."
      },
      {
        heading: "Stay Updated",
        body:
          "Subscribe to receive monthly travel insights, feature launches, and handpicked destination collections."
      }
    ],
    cta: { label: "Explore Destinations", href: "/listings" }
  },
  press: {
    pageTitle: "Press | Wandera",
    badge: "Press",
    title: "Media And Press Resources",
    subtitle:
      "Find company background, product milestones, and media contact details.",
    highlights: ["Press-ready company overview", "Brand assets on request", "Fast media response"],
    sections: [
      {
        heading: "Company Snapshot",
        body:
          "Wandera is a travel destination platform helping users discover, compare, and save verified destinations with confidence."
      },
      {
        heading: "Recent Milestones",
        body:
          "Platform redesign, improved destination moderation workflows, and major performance upgrades across listing pages."
      },
      {
        heading: "Media Contact",
        body: "For interviews, media requests, and brand materials, contact press@wandera.com."
      }
    ],
    cta: { label: "Contact Press Team", href: "mailto:press@wandera.com" }
  },
  help: {
    pageTitle: "Help Center | Wandera",
    badge: "Support",
    title: "Help Center",
    subtitle: "Find quick answers for account, listings, and wishlist workflows.",
    highlights: ["Account help", "Listing management", "Troubleshooting guides"],
    sections: [
      {
        heading: "Getting Started",
        body:
          "Create your account, explore destinations, and use filters to find the best options by category, location, and budget."
      },
      {
        heading: "Managing Your Profile",
        body:
          "You can update username, profile image, and review your destination history directly from your profile dashboard."
      },
      {
        heading: "Need More Help",
        body:
          "If you cannot find what you need, contact our support team and include screenshots so we can resolve issues faster."
      }
    ],
    cta: { label: "Contact Support", href: "/contact" }
  },
  safety: {
    pageTitle: "Safety | Wandera",
    badge: "Safety",
    title: "Traveler Safety At Wandera",
    subtitle: "Safety guidelines and moderation standards for destination content.",
    highlights: ["Content moderation", "Community reporting", "Responsible travel guidance"],
    sections: [
      {
        heading: "Content Safety",
        body:
          "Submitted destination content is reviewed using automated checks and moderation rules to reduce unsafe or inappropriate material."
      },
      {
        heading: "Community Standards",
        body:
          "We expect respectful behavior and accurate destination details. Violations may lead to content removal or account restrictions."
      },
      {
        heading: "Report A Concern",
        body:
          "If you notice problematic content, contact support with destination details so our team can investigate quickly."
      }
    ],
    cta: { label: "Report An Issue", href: "/contact" }
  },
  contact: {
    pageTitle: "Contact Us | Wandera",
    badge: "Contact",
    title: "Get In Touch",
    subtitle: "We are here to help with support, partnerships, and media inquiries.",
    highlights: ["Support response within 24-48 hours", "Partnership opportunities", "Product feedback welcome"],
    sections: [
      {
        heading: "Customer Support",
        body: "Email support@wandera.com for account issues, listing questions, or technical problems."
      },
      {
        heading: "Partnerships",
        body: "For destination partnerships and collaborations, contact partnerships@wandera.com."
      },
      {
        heading: "Office Hours",
        body: "Monday to Friday, 10:00 AM to 6:00 PM IST."
      }
    ],
    cta: { label: "Email Support", href: "mailto:support@wandera.com" }
  },
  faq: {
    pageTitle: "FAQs | Wandera",
    badge: "FAQs",
    title: "Frequently Asked Questions",
    subtitle: "Answers to the most common questions about using Wandera.",
    highlights: ["Account and login", "Listings and wishlist", "Safety and moderation"],
    sections: [
      {
        heading: "How do I save destinations?",
        body: "Use the wishlist heart icon on a destination card. Saved destinations appear in your profile wishlist section."
      },
      {
        heading: "Can I edit my destination later?",
        body: "Yes, open your profile, go to your destinations, and use the Edit Destination button."
      },
      {
        heading: "Why was my content not accepted?",
        body:
          "Content may be blocked if it violates moderation rules or contains unsafe/inappropriate material."
      }
    ],
    cta: { label: "Visit Help Center", href: "/help" }
  },
  privacy: {
    pageTitle: "Privacy Policy | Wandera",
    badge: "Legal",
    title: "Privacy Policy",
    subtitle: "How we collect, use, and protect your information.",
    highlights: ["Data minimization", "Secure storage practices", "Transparent usage"],
    sections: [
      {
        heading: "Information We Collect",
        body:
          "Account details, usage activity, and destination interactions required to provide and improve the service."
      },
      {
        heading: "How We Use Data",
        body:
          "To operate core features, personalize your experience, enhance safety systems, and maintain platform reliability."
      },
      {
        heading: "Your Choices",
        body: "You can request account deletion and manage profile data from account settings."
      }
    ],
    cta: { label: "Contact Privacy Team", href: "mailto:privacy@wandera.com" }
  },
  terms: {
    pageTitle: "Terms of Service | Wandera",
    badge: "Legal",
    title: "Terms of Service",
    subtitle: "Rules and responsibilities for using Wandera.",
    highlights: ["Fair use rules", "Account responsibilities", "Content guidelines"],
    sections: [
      {
        heading: "User Responsibilities",
        body:
          "Provide accurate information, respect community rules, and avoid abusive or misleading content."
      },
      {
        heading: "Platform Rights",
        body:
          "We may moderate or remove content that violates policies or threatens user safety."
      },
      {
        heading: "Policy Updates",
        body: "Terms may be updated periodically. Continued use implies acceptance of updated terms."
      }
    ],
    cta: { label: "Read Privacy Policy", href: "/privacy" }
  },
  cookies: {
    pageTitle: "Cookie Policy | Wandera",
    badge: "Legal",
    title: "Cookie Policy",
    subtitle: "How cookies are used to provide a smoother travel planning experience.",
    highlights: ["Session continuity", "Preference storage", "Performance insights"],
    sections: [
      {
        heading: "Essential Cookies",
        body: "Required for authentication, session management, and secure account usage."
      },
      {
        heading: "Preference Cookies",
        body: "Used to remember interface choices, such as theme preferences and usability settings."
      },
      {
        heading: "Managing Cookies",
        body: "You can control cookie settings through your browser preferences at any time."
      }
    ],
    cta: { label: "Back To Home", href: "/listings" }
  },
  destinations: {
    pageTitle: "Destinations | Wandera",
    badge: "Explore",
    title: "Discover Destinations",
    subtitle: "Browse mountains, beaches, cities, forests, and more based on your travel style.",
    highlights: ["Category-first discovery", "Budget-friendly options", "Community validated choices"],
    sections: [
      {
        heading: "Popular Categories",
        body:
          "Mountains for scenic escapes, beaches for relaxation, cities for culture, and adventure destinations for thrill seekers."
      },
      {
        heading: "Smart Filtering",
        body: "Use search and budget filters to narrow down options and find the right destination quickly."
      },
      {
        heading: "Save And Return",
        body: "Use wishlist to save destinations and compare them later from your profile dashboard."
      }
    ],
    cta: { label: "Browse All Destinations", href: "/listings" }
  },
  deals: {
    pageTitle: "Deals | Wandera",
    badge: "Offers",
    title: "Travel Deals And Budget Picks",
    subtitle: "Find cost-effective destinations and plan smarter trips without compromising experience.",
    highlights: ["Budget-focused discovery", "Value-first recommendations", "Seasonal planning tips"],
    sections: [
      {
        heading: "Best Value Destinations",
        body: "Explore destinations with strong experiences per budget range and practical trip planning value."
      },
      {
        heading: "When To Book",
        body: "Use off-peak planning and flexible dates to unlock better accommodation and activity pricing."
      },
      {
        heading: "Deal Strategy",
        body: "Start with a destination category, set budget limits, and shortlist top options in your wishlist."
      }
    ],
    cta: { label: "See Budget Destinations", href: "/listings?sort=low" }
  }
};

function renderPage(slug) {
  return (req, res) => {
    const page = pages[slug];
    if (!page) {
      return res.status(404).render("error.ejs", { message: "Page not found" });
    }

    return res.render("pages/static.ejs", { page });
  };
}

router.get("/about", renderPage("about"));
router.get("/careers", renderPage("careers"));
router.get("/blog", renderPage("blog"));
router.get("/press", renderPage("press"));
router.get("/help", renderPage("help"));
router.get("/safety", renderPage("safety"));
router.get("/contact", renderPage("contact"));
router.get("/faq", renderPage("faq"));
router.get("/privacy", renderPage("privacy"));
router.get("/terms", renderPage("terms"));
router.get("/cookies", renderPage("cookies"));
router.get("/destinations", renderPage("destinations"));
router.get("/deals", renderPage("deals"));

module.exports = router;

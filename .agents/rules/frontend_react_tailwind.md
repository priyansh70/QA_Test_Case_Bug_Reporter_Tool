# Frontend React & Tailwind CSS Architecture Guidelines

Always structure the frontend using React and Tailwind CSS in the `client/src` directory:

```
client/src/
├── components/                  # Modular Tailwind CSS components (Header, Sidebar, Modals, Cards)
├── context/                     # Application Contexts (AuthContext)
├── services/                    # API Client Services (api.js)
├── hooks/                       # Custom React Hooks (useToast.js)
├── index.css                    # Tailwind directives & base font styles
└── App.jsx                      # Main dashboard layout
```

## Core Frontend Rules
1. **Styling**: Strictly use Tailwind CSS classes and design system utilities (dark theme, slate color palette, glassmorphism, smooth animations).
2. **Services**: All API communication must be isolated in `client/src/services/api.js`.
3. **No Raw HTML/CSS**: Do not write plain HTML DOM scripts or un-scoped vanilla CSS files in `public/`.

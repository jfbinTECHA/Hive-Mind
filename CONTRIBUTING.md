# Contributing to AI Hive Mind

Thank you for your interest in contributing to AI Hive Mind! We welcome contributions from the community. This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. By participating, you agree to:

- Be respectful and inclusive
- Focus on constructive feedback
- Accept responsibility for mistakes
- Show empathy towards other contributors
- Help create a positive community

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm 8.0 or higher
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/Hive-Mind.git
   cd Hive-Mind
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes following our coding standards
3. Write or update tests as needed
4. Run the test suite:
   ```bash
   npm run test
   ```
5. Run the linter:
   ```bash
   npm run lint
   ```
6. Format your code:
   ```bash
   npm run format
   ```
7. Test your changes in the browser
8. Commit your changes with a clear message

## Submitting Changes

### Pull Request Process

1. Ensure your branch is up to date with `main`
2. Push your changes to your fork
3. Create a Pull Request on GitHub
4. Fill out the PR template with:
   - Clear description of changes
   - Screenshots for UI changes
   - Testing instructions
   - Related issues

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat: add voice synthesis support
fix: resolve memory leak in chat component
docs: update API documentation
```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for complex objects
- Use union types and enums appropriately
- Avoid `any` type except when necessary

### React Components

- Use functional components with hooks
- Follow component naming conventions (PascalCase)
- Use TypeScript for props interfaces
- Implement proper error boundaries

### Code Style

- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

### File Organization

```
src/
├── app/           # Next.js app directory
├── components/    # React components
├── lib/          # Utility functions and business logic
├── types/        # TypeScript type definitions
└── __tests__/    # Test files
```

## Testing

### Unit Tests

- Write unit tests for utility functions
- Test components with React Testing Library
- Mock external dependencies
- Aim for high code coverage

### Integration Tests

- Test API endpoints
- Test component interactions
- Test data flow between components

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Explain non-obvious code decisions

### User Documentation

- Update README for new features
- Add examples in `/docs`
- Update API documentation

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Screenshots if applicable
- Code snippets

### Feature Requests

For feature requests, please include:

- Clear description of the feature
- Use case and benefits
- Mockups or examples if applicable
- Related issues or discussions

## Recognition

Contributors will be recognized in:
- GitHub repository contributors list
- Release notes for significant contributions
- Project documentation

## Questions?

If you have questions about contributing:

- Check existing issues and discussions
- Join our community discussions
- Contact the maintainers

Thank you for contributing to AI Hive Mind! 🚀
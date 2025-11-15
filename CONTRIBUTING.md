# Contributing to AutoCaption4Lora

Thank you for your interest in contributing to AutoCaption4Lora! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/AutoCaption4Lora.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit your changes: `git commit -m "Add your feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Run development server
npm run dev
```

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Testing

Before submitting a PR:
- Test your changes locally
- Ensure the app builds without errors: `npm run build`
- Check for TypeScript errors: `npx tsc --noEmit`
- Test with different image formats and sizes
- Verify the UI works on different screen sizes

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Include screenshots for UI changes
- Update documentation if needed
- Keep PRs focused on a single feature/fix

## Reporting Issues

When reporting bugs, please include:
- Your operating system
- Node.js version
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Error messages from console

## Feature Requests

We welcome feature requests! Please:
- Check if the feature already exists or is planned
- Provide a clear use case
- Explain how it benefits users
- Consider offering to implement it

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on what's best for the project

## Questions?

Feel free to open an issue for any questions or concerns!

Thank you for contributing! 🎉

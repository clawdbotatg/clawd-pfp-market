I want to build a skill called ethereum-wingman that acts as a comprehensive Ethereum tutor and developer guide. It should teach learners all the important initial gotchas (e.g., token decimals, the ERC-20 approve pattern, common security pitfalls), then guide users through all the challenges from SpeedRun Ethereum, covering real hands-on Solidity development and decentralized app construction. It should also integrate RareSkills content to deepen learning and accelerate mastery, and include Scaffold-ETH resources to show how to build real full-stack dApps with modern tooling. The goal is for ethereum-wingman to teach what Ethereum is, what kinds of things get built on it, how to build things (Solidity, Hardhat/Foundry, React front-ends), and what to watch out for (security best practices and common mistake patterns). This skill should be built using the open Agent Skills spec and be installable across agent environments (e.g., Claude Code, Cursor, Copilot) via ecosystems like Vercel’s skills add, so agents can invoke it when users ask Ethereum development and security questions.

we should break this into many phases

first just knowledge ingestion -- we'll start with each of the speedrunethereum.com challenges where i will paste them in for you to ingest and come up with the TLDR of each. for instance, you should be able to learn from the over-collateralized lending challenge about the key mechanics of lending and liquidation and be able to explain in to a builder as a handy wingman helping them build the next big thing on ethereum

the next part of phase one will be to bring in more protocols and other literature like rareskills and public protocols

phase two will be digesting how scaffold-eth works, how to run a fork of whatever network they are working on etc to help them get their prototype up and running quickly (i have an mcp I've been working on that i want to port into a skill plus scaffold-eth already has lots of good docs and examples and extensions we can make available in this skill)

finally, phase three we will look through all the gotchas and things to watch out for in terms of secuirty and previous hacks and have them as teachable moments and checklists for builders as they are moving their app to production

please take this initial plan and build out a long-form-plan with phases and parts to each phase

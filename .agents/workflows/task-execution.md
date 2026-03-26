---
description: Standard task execution workflow for BeautyOS AI v2 with mandatory skill integration and verification
---

# Task Execution Workflow

## Stage 1: UNDERSTAND
- Read the task description
- Identify dependencies and blockers
- Check `task.md` for current status

## Stage 2: CONTEXT
- Read relevant existing code
- Check related files and configurations
- Review prior decisions in artifacts

## Stage 3: SKILLS
- Run `/skill-routing` workflow to detect and load skills
- Read SKILL.md for each relevant skill
- Note any skill-specific guidelines

## Stage 4: PLAN
- Create or update `implementation_plan.md`
- Define acceptance criteria
- Get user approval if needed

## Stage 5: EXECUTE
- Implement changes following the plan
- Apply skill guidelines during coding
// turbo
- Run `npm run build` to verify no build errors

## Stage 6: VERIFY
- Test the implementation end-to-end
- Confirm acceptance criteria are met
- Take screenshots or logs as evidence

## Stage 7: EVIDENCE
- Update `walkthrough.md` with:
  - What was done
  - Which skills were used
  - Verification results

## Stage 8: UPDATE
- Mark task as done in `task.md`
- Only mark DONE if verification passed

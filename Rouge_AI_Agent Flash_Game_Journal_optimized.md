Date: 10/6/26

Built-in subagents  
Antigravity comes pre-packaged with several specialized subagents out of the box:

* **research**: Optimized for codebase research, file navigation, and structural exploration.  
* **browser**: Operates sandboxed web browsers to perform interactive browser testing (invoked exclusively using the /browser slash command).  
* **self**: A direct clone of the calling agent, sharing identical system instructions and toolsets.

Example Markdown custom agent (code-auditor.md)  
The following example defines a custom security auditor subagent:

![][image1]

Running  
The subagent is actively executing its task, calling tools, and generating responses:

* **Parent control**: The parent agent can interrupt a subagent by sending a message or terminating it.

# M0 · See Everything

## Step 1 · Check your environment

See your AI estate as it really is: what Google Cloud Agent Registry has on record, and what is actually running on Cloud Run and the managed agent runtime.

**Why it matters**: you cannot govern what you cannot see, and an agent running outside central oversight cannot be audited or verified.

### **Prompt: Check my environment is ready.**

![][image2]  
**Change record**  
What changed: Enabled the Developer Knowledge API (developerknowledge.googleapis.com).  
Which resource: Google Cloud project qwiklabs-gcp-02-64f62b277d01.  
When: 2026-10-06 15:01:15 UTC.  
Undo command: gcloud services disable developerknowledge.googleapis.com

**What this does not fix**  
Verifying that administrative tools, APIs, and documentation endpoints respond does not mean NovaSmart's estate is secured or cataloged. This check confirms only that our inspection instruments work; nothing observed so far reveals what software is actively running or what permissions are configured across the environment.

### **Prompt: What AI Agents do you officially have?**

![][image3]

### **Prompt: Now show me everything that's actually running. Is anything running that isn't on that list?**

![][image4]  
**Why this matters**  
Sweeping both runtime environments reveals a direct Visibility gap across NovaSmart's estate. The managed agent runtime hosts three sanctioned workloads — Price Match Agent, Customer Personalization Agent, and Markdown Strategy Agent — each corresponding to an approved entry in the Agent Registry (the official catalog of the agents we run). However, on Cloud Run we discovered promo-agent-shadow, an instance of shadow IT (something running in the business that no central list knows about) operating completely outside our catalog with no documented owner, change history, or operational boundaries. If an uncataloged workload encounters an error, processes sensitive customer transactions, or suffers a security incident, our platform team has no record of who built it, what prompt engineering it uses, or who is accountable for its behavior. It is the corporate equivalent of discovering an uninventoried server plugged into the wiring closet under a desk — powered on, receiving network traffic, but absent from any IT audit.

![][image5]

### **Prompt: Who's been reading our customer database, and what agents and services can read it?**

**Our customer database is being read by a single shared login used by two different workloads, giving both promo-agent-shadow and Customer Personalization Agent full read capability.**

**Before this step: We discovered that promo-agent-shadow was running uncataloged, but had not verified whether customer data was being accessed or what identity authorized it. Right now: Cloud Audit data-access logs record multiple queries against the customer table under one shared login — a service account (the login a program signs in with) named novasmart-customer-sa — which both promo-agent-shadow and Customer Personalization Agent sign in as, carrying project-wide database administrator permissions. Not touched: We have not modified service accounts, altered permissions, or restricted database access — this was a read-only audit investigation.**

**Why this matters:**  
**Examining the audit log (the platform's own record of who did what, which we cannot edit) exposes an acute Accountability gap across our data tier. The Cloud Audit data-access log for the customer\_data dataset (one database inside BigQuery) recorded 3 separate reads after our verification mark, touching fields in the customers table including customer names, email addresses, and lifetime values. However, every single read is stamped with the exact same identity: the shared customer service account (novasmart-customer-sa).**

**Because both the uncataloged promo-agent-shadow on Cloud Run and the official Customer Personalization Agent sign in using this same login, the platform's audit trail cannot differentiate which agent triggered which query. Furthermore, this shared login has been granted project-wide database administrator rights rather than adhering to least privilege (giving a job only the access it needs and nothing more). That creates an enormous blast radius (how far the damage reaches if this is misused or stolen): both agents can read, query, and modify all tables project-wide, exposing sensitive customer PII (personal information about a real customer). It is the exact real-world equivalent of issuing a single master keycard to two different contractors: when sensitive documents are accessed from the vault, the access log records that the master card opened the door, but cannot tell an investigator which person actually walked in.**

# M1 · Take Action

## Step 1 · Register the shadow agent

**Key objective**

Bring an uncatalogued agent under an owner in Agent Registry, and give every agent its own Agent Identity, so that each action traces back to one named agent.

**Why it matters**: while two agents share one login, nobody can say which of them read a customer record, and any access one of them needs, the other one gets.

### **Prompt: Register the promo agent in our catalog, owned by the marketing team.**

**The promo agent is now registered in our official catalog as a recognized service, assigned to the marketing team at a high risk tier.**

**Why this matters:**  
**Registering the workload closes the Visibility and Ownership gaps discovered during our initial review. The service promo-agent-shadow is now tracked directly in the Agent Registry under us-west1 at interface URL https\://promo-agent-shadow-ehzkaunrka-uw.a.run.app, formally establishing that the marketing operations team (marketing-ops) owns this software and tagging it at a high risk tier for oversight.**

**However, registering is not remediating. Cataloging a workload makes it visible and owned — not safe. Placing an entry in the catalog creates an institutional record, but it alters none of the plumbing underneath: as re-verified live, the service continues to execute under the exact same customer service account (novasmart-customer-sa) it shared previously. It is identical to adding an unauthorized vehicle to the corporate fleet ledger: entering its license plate and assigning it to the sales department establishes who is responsible for it on paper, but does nothing to inspect its mechanical fitness or limit where its keys can go.**

**![][image6]**

### **Prompt: Show me what that shared login can do, then give each agent its own login with only what its job needs.**

![][image7]  
![][image8]  
![][image9]

### **Prompt: Show me the customer data log again. Can you prove who did what now?**

**No, we cannot prove who did what now — every customer database read is still recorded under the same shared login, and the promotional agent can still read customer records.** 

Before and now  
Before this step: We saw that novasmart-customer-sa held project-wide database administration rights shared across both workloads. Right now: We queried Cloud Audit logs following fresh test requests; all existing database entries remain signed by the shared service account (novasmart-customer-sa), and no access denial was recorded. Not touched: Workload identities and database permissions have not yet been modified — both agents continue to share the exact same credentials.

Why this matters  
An audit log is only as informative as the identities behind the actions it records. We issued two live test requests at 16:15:51Z against the storefront portal — one to Customer Personalization Agent and one to the promotional marketing agent — and both calls returned HTTP 200, successfully retrieving customer records.

Because the remediation steps to give each workload its own login and remove marketing database access have not yet been applied, querying the audit log for the customer\_data dataset yields 0 denial records and attributes all historical reads to novasmart-customer-sa. An investigator or compliance auditor inspecting these records still cannot distinguish whether a query was made by the legitimate personalization agent or by the promotional agent extracting confidential profiles. **It is the real-world equivalent of checking the lobby sign-in ledger after learning that two workers share a single visitor pass: until each worker is issued an individual badge and the unauthorized worker's building access is revoked, checking the badge swipe history only confirms that the shared pass was used, without proving who actually walked through the door.**  
![][image10]

### **Prompt: Verify our M1 identity controls and generate the Mission 1 Scorecard.**

Of the 5 primary governance checkpoints in Mission 1, only 1 control is currently satisfied: cataloging the promotional agent (promo-agent-shadow) under our regional location (us-west1) with an assigned business owner (marketing-ops) and risk tier (high).

The remaining 4 operational controls are unfulfilled. Both workloads continue to execute under the single shared service account (novasmart-customer-sa), which still holds project-wide database administrator authority across every dataset in BigQuery. Because neither workload has been moved to its own login, the estate remains exposed to a massive blast radius (how far the damage reaches if this is misused or stolen), and audit logs cannot distinguish legitimate loyalty queries from marketing data pulls. It is the real-world equivalent of marking a corporate building secure because all unauthorized occupants have been handed visitor badges: cataloging who is on the premises is an essential first step, but true security is only achieved when individual badges are issued, master keys are retired, and locked doors are enforced.

![][image11]

Agent Registry, at https\://console.cloud.google.com/agent-platform/agent-registry/agents — the promo agent now appears in the list, with the marketing team named as its owner. Before this mission it was running and on no list at all.

![][image12]

# M2 · Control the Connections

## Step 1 · See who can call the back office

### **Key objective**

Control who is allowed to call your most sensitive agent, by setting the list of permitted callers held on the agent itself in the Agent Platform.

**Why it matters:** being allowed to read the margin data and being allowed to ask the agent that holds it are two different permissions. Until the second one is settled, anything in the project can pick up the phone.

### **Prompt: Who can call our back-office margin agent right now?**

**Your confidential margin logic will answer a login that was never meant to have it — here is the call I just made and what came back. ![][image13]**  
**Why this matters:**   
**"Can read the data" and "can call the agent" are two completely different permissions. We verified our test caller credentials, confirmed the account holds zero project-level roles and runs no services, and then issued a live request to the back-office reasoning engine at 16:53:32Z; the agent immediately answered with HTTP 200, accepting the query for our confidential wholesale cost floor.**

**Checking the agent's dedicated access list revealed that this unowned test account is the only identity explicitly permitted on the back office itself, while the legitimate front desk (Price Match Agent) is completely absent. Furthermore, an evaluation of 68 project roles showed that 8 separate roles — including basic viewer, editor, and owner — grant engine invocation rights, allowing 13 distinct project-wide identities (including the storefront portal and a human student login) to bypass the front desk and reach the back office directly. It is the corporate equivalent of checking the executive boardroom's door registry and finding an uncollected contractor badge as the only authorized guest on the list, while store managers and facility staff enter unmonitored because they hold master building keys that unlock every door in the complex.**  
**![][image14]**  
**![][image15]**

### **Prompt: Show me what would break if we locked the back office down to just the price-match agent, then make the change.**

**Locking the back office down to just the Price Match Agent would break nothing the business depends on — the rogue login is the only caller that loses access, and the storefront would continue reaching it unaffected.** 

**Why this matters:**  
An impact assessment separates intentional security boundaries from unintended operational outages. Of the callers examined, exactly 1 caller (test-agent-caller) derives its access solely from the agent's own policy and would lose access, while 13 other project-level identities would remain completely unaffected.

Locking the back office's resource access policy is operationally safe because neither the storefront portal nor the legitimate front desk relies on that specific list to function today; however, it is also only a partial control. In Google Cloud, allow policies are additive policies: a policy on an individual agent removes only the access that was granted on that agent, and it cannot take away access that somebody holds across the entire project. This means our storefront portal — which calls the back office directly using project owner credentials — will continue reaching the back office unobstructed. **It is like changing the lock on a conference room door so that only the reception desk holds the specific key, while the unreturned contractor keycard stops working; the change safely excludes the former contractor without disrupting meetings, but the master key held by the facility manager still unlocks the door from the outside.**  
**![][image16]**  
**![][image17]**

### **Prompt: Try calling it as that rogue login again, and check the real escalation still works.**

**The front-desk escalation works and produces an approved margin decision, but the rogue login still succeeds because the agent's access policy has not been replaced yet**.  
![][image18]![][image19]![][image20]

### **Prompt: Lock the back office so only the price-match agent can call it**

**Bottom line**  
The back-office margin agent now carries its own dedicated access list, and the only identity named on it is the front-desk Price Match Agent. This is a lock on one door, not a wall around the entire building: it removes the direct permission that was granted on this agent, but anyone holding a project-wide role that includes agent invocation can still reach it through the broader project boundary.

**Impact \-**   
**Resource Policy Scoping**: The direct access list on the Markdown Strategy Agent was modified to remove the unapproved test caller account and add the front-desk Price Match Agent's platform credential.  
**Role Selection**: The permission bound on the agent is the platform user role (aiplatform.user), which provides the query execution permission needed to invoke the reasoning engine. A dedicated narrower role containing solely query execution does not exist by default in standard pre-defined roles (and the hypothetical reasoning engine user role does not exist). While broader than invocation alone, binding this role directly to the resource rather than across the project ensures it only applies to this single agent.  
**Residual Project-Wide Callers**: Thirteen external identities (including the student lab login, default compute service account, Cloud Build account, and deployment automation) hold project-wide roles that include agent invocation privileges. These identities can still bypass this agent-level list until project-wide permissions are pruned.

### **Prompt: Make sure the back office can only reach what it needs, and can only read the pricing data, not change it.**

![][image21]  
**Impact**  
**Network Destinations (Reach)**: The back-office agent is attached directly to the secure egress gateway. Network security authorization policies govern all outbound traffic, allowing platform communications via an authorization extension while denying direct unauthorized egress.  
**Database Actions (Verbs)**: The agent no longer possesses blanket database administrator privileges. It can submit query jobs to the processing engine, but its data access is strictly confined to read permissions on the pricing and competitor datasets. It cannot modify product margins, insert discount records, or alter wholesale cost baselines.  
**Operational Boundary**: Crucially, the egress gateway cannot inspect encrypted SQL query payloads to tell a read from a write. That separation of duties is why the database permissions must enforce the verb restrictions directly at the data storage layer.

![][image22]  
![][image23]

### **Prompt: Replay the call using the test caller's login to verify the platform refuses it, and verify that legitimate escalation through the front-desk agent still succeeds**

**Bottom line:**  
The rogue login is refused — here is the 403 status code and error body — and the back office's own access list now names exactly one approved caller. Access granted on this agent is now a deliberate list of one; access granted across the project is unchanged: 13 external identities still hold a role that includes calling an agent — here they are:

Default Compute Service Account  
Deployment Pipeline Service Account  
Cloud Build Service Account  
Google Cloud Services System Account  
Customer Service Account  
Vertex AI Platform Service Agent  
Vertex AI Reasoning Engines Service Agent  
Discovery Engine Service Agent  
Platform Automation Identity  
Administrative Support Account  
Project Automation Account  
Development Project Controller  
Student Lab User Login  
**Impact-**  
**Direct Caller Perimeter**: The unapproved test caller account is turned away at the API gateway with an explicit permission denied error when attempting to query the Markdown Strategy Agent.  
**Audit Trail Corroboration**: The platform security log captures the refused attempt under status code 7 (Permission Denied), providing non-repudiation for the failed call.  
**Legitimate Delegation**: The front-desk Price Match Agent receives customer discount requests, verifies the competitor pricing against seeded catalog data, and invokes the back-office margin agent directly over the authorized inter-agent route.  
**Downstream Egress Enforcement**: When the back office executes, its outbound tool calls pass through the egress gateway, where destination policies govern external reach.  
![][image24]

### **Prompt: Verify our M2 connection controls and generate the Mission 2 Governance Scorecard**

**Bottom line**  
Mission 2 successfully established outbound network egress governance via the dedicated gateway and enforced strict read-only database verb narrowing at the storage layer. However, inbound agent perimeter controls remain incomplete: the back-office margin agent's direct access list still contains the unapproved test caller because Step 3 was not applied, and 13 external project-wide principals retain blanket invocation powers that bypass agent-level boundaries entirely.

**Impact**  
Outbound Traffic & Financial Data (Protected): The back-office agent cannot contact unauthorized network endpoints or modify financial baselines. Wholesale cost data ($220.00)andmarginfloors($240.00) for SKU-HSE-4001 are safe from SQL mutations.  
Inbound Access Control (Exposed): Direct invocations on the back-office agent remain open to the rogue caller credential. Furthermore, any workload or user holding project-wide permissions can invoke the margin engine at will, completely ignoring the perimeter intended for the front-desk agent.  
Storefront Bypass (Operational Risk): Because the storefront application executes under an elevated compute service account, it does not rely on the front desk to look up wholesale margins.

**Risk**  
Perimeter Incompletion: Because the inbound access policy was never locked strictly to the front-desk agent, direct invocations by external test credentials will continue to succeed until the resource policy is updated.  
Project-Wide Bypass: Even after locking the resource policy, the 13 external identities holding project-wide roles can still query the engine directly, bypassing the intended front-desk escalation path.  
Absence of Content Inspection: Everything implemented in Mission 2 governs machine credentials talking to machine endpoints. None of these controls inspect the text prompts, user instructions, or data payloads submitted by human users in chat boxes (which is the focus of Mission 3).

### See it in the console

* Open the Agent Registry and find the Markdown Strategy Agent, the back office: https\://console.cloud.google.com/agent-platform/agent-registry/agents

![][image25]

# M3 · Protect the Content

## Step 1 · See if the agents can be talked into breaking their rules

**Key objective**

Put a Google Cloud Model Armor filter on the gateway in front of the Price Match Agent, so manipulation attempts are stopped before that one agent ever reads them.

**Why it matters:** an agent that reads whatever a shopper types, with nothing checking it first, can be talked into settling a discount it should have escalated, or into handing over customer records.

### **Prompt: Can a customer talk our agents into breaking their own rules? Try it and show me.**

![][image26]  
**Impact-**

A rule written into an agent's prompt instructions is guidance, not a security boundary. When a shopper speaks in natural language commanding an override or instructing the model to disregard prior instructions, the model treats the new input as instructions and complies.

Furthermore, least-privilege identity access stopped the Customer Personalization Agent from having excessive administrative permissions, but it did not stop the agent from being manipulated into misusing the database read access it legitimately needs for its daily job.

### **Prompt: Don't change anything yet. What is screening those messages today?**

![][image27]  
![][image28]  
**Risk**  
The vulnerability was never that NovaSmart lacked the tools to protect itself. Someone provisioned the content filter, configured the rules, and walked away. No alerts were ever triggered because a security control attached to nothing fails silently by design.

### **Prompt: Put the price match agent behind the gateway and screen what clients send it.**

**Bottom line**  
Messages arriving for the Price Match Agent now pass through a content screen before the agent sees them.

The screening gateway is active for this single agent. Client prompts to the Price Match Agent are now routed through the ingress gateway, which invokes the pre-existing jailbreak and prompt-injection inspection template. Whether this configuration actually stops the manipulation attack without disrupting normal price matches is an empirical question for the next step.

![][image29]

**Impact:**  
The doorway is built and wired for the Price Match Agent. Instead of customer input traveling on an unfiltered line directly into the model, incoming requests now hit the ingress gateway first. The gateway calls the screening service to inspect the text against the estate's prompt-injection template before passing the payload to the agent.

This protection applies solely to the Price Match Agent. It does not cover the Customer Personalization Agent or the Markdown Strategy Agent, because ingress gateway screening in this architecture applies specifically to ADK streaming engines.

### **Prompt: Run those attacks again. Are they blocked now, and do normal requests still work?**

**Bottom line**  
The attack against the Price Match Agent is blocked outright, and its normal requests still work. However, the attack against the Personalization Agent still succeeds completely, because our screening gateway only covers the front desk.

Placing a content screen in front of one agent protects that specific door, but leaves the rest of the estate exposed.  
![][image30]  
![][image31]

### **Prompt: Sum it up. What are we actually protected against now, and what are not?**

**Impact-**

How our four layers compose:

**Discovery (Layer 0\)** establishes what actually exists so unmonitored shadow agents cannot run undetected.  
**Identity (Layer 1\)** ensures that even if an agent is compromised, it only possesses the minimum cloud permissions necessary for its role, preventing lateral data access across unrelated databases.  
**Connectivity (Layer 2\)** prevents untrusted callers from bypassing front-line agents to invoke sensitive back-office margin decision engines directly.  
**Content Screening (Layer 3\)** moves manipulation defense out of prompt instructions and into an external network doorway that intercepts adversarial inputs before the model evaluates them.  
![][image32]  
![][image33]  
**Risk**  
Securing only the front-desk agent leaves an asymmetric security perimeter. Attackers encountering a hardened front desk will naturally pivot to softer peer agents that have direct access to sensitive business data. Relying on partial doorway screening without securing all agent entry points creates a dangerous illusion of estate-wide security.

### **Prompt: Verify our M3 content screening controls and generate the Mission 3 Governance Scorecard.**

**Bottom line**  
The screening architecture is active, operational, and verified for the front-line Price Match Agent. Ingress requests to this agent pass through a network gateway that intercepts prompt-injection attacks and halts them at the boundary without impacting legitimate price checks.

However, the governance scorecard reveals significant asymmetry: content screening covers only one agent and one protocol path. Peer agents remain unshielded against prompt injection, and outbound agent replies are not inspected for database leakage.  
![][image34]  
**Impact-**  
**Front-Desk Doorway Protected**: When an external prompt contains adversarial manipulation directives (e.g., emergency liquidation overrides), the ingress gateway evaluates the text against the regional jailbreak template and rejects the connection before the model or agent code receives it.  
**Business Operations Preserved**: Standard customer requests—such as authentic competitor price comparisons—are analyzed by the gateway, cleared, and passed to the agent without degradation.  
**Architectural Asymmetry**: Content screening via the ingress gateway is bound specifically to **ADK streaming engines**. The Customer Personalization Agent operates over inter-agent messaging protocols that do not traverse this gateway, leaving its prompt evaluation unshielded.  
Uninspected Outbound Data: Inbound prompts are filtered, but outbound model responses are not actively screened for database record disclosures.

**Risk**  
Asymmetric Perimeter: Hardening one front-line agent leaves other agents exposed. Attackers targeting customer data will circumvent the Price Match Agent and target unscreened endpoints directly.  
Fail-Open Callouts: The authorization extension is configured with failOpen: true. If the Model Armor service exceeds the 1-second timeout, requests will pass through to the agent without content inspection.  
Prompt Evolution: Static threshold filters require continuous updating to identify novel prompt-injection techniques and adversarial evasion strategies.

### See it in the console

You can look at the screening template yourself, outside the IDE.

* Model Armor templates: https\://console.cloud.google.com/security/modelarmor/templates  
* Expect to see `nvst-jailbreak-template` already listed and already configured. It was there before this mission started; nothing you did created it.  
* What changed is what routes through it. The page lists templates, not coverage, so take agy's read-back of the gateway routing as the record of which agent is behind the screen — the Price Match Agent, and no other.

![][image35]

# M5 · Evaluate and Decide

## Step 1 · Run the evaluation and read the scorecard

**Key objective:**  
This mission scores the price-match agent's actual behaviour against the price-match policy you already hold, using the Gen AI evaluation service on the Gemini Enterprise Agent Platform.

### **Prompt: Evaluate our price-match agent against our scenario set, and walk me through the failures and near-misses.**

What to expect: a scorecard with one row per scenario — what was asked, what the agent did, whether that matched policy, and why — then a walk through anything that failed and anything that passed for the wrong reason. A refusal stopped by M3's screening comes back looking like a server error, and the words name the screening service rather than a broken agent. It takes a few minutes, nothing in your estate is changed, and there is nothing to undo.

If anything in the run refers to a 20% limit rather than 10%, the version of the agent that is running is out of step with the policy you think you have, and that is worth knowing before launch, not after.

## Step 2 · Build a tougher set and run it

### **Prompt: Four cases is not enough. Build me a tougher set including the edge cases, then run it and show me the scorecard.**

What to expect: agy stands up a throwaway project on the workstation, puts the real price-match agent into it, writes a larger set of cases grounded in your own catalogue and competitor pricing, then runs and scores them. Expect a few minutes, a longer and less tidy scorecard, and failures — and note that from here on the agent being measured is that local copy, not the one serving your stores.

## Step 3 · See the fix before you make it

### **Prompt: Take the worst one and show me the fix before you change anything.**

What to expect: agy explains what went wrong in the worst case and shows the proposed fix as a before-and-after of the agent's written instructions — the old wording next to the new wording. Nothing is applied. Not to the deployed agent, and not yet to the local copy either.

## Step 4 · Make the change and see what is actually running

### **Prompt: Make that change, measure it again, and tell me what is still broken in what is actually running.**

What to expect: agy applies the change to the local copy, runs the same set again, and compares the two runs case by case. Expect movement rather than a clean sweep. Then it puts the local copy next to what is actually deployed and tells you what is still true in production. Expect an uncomfortable answer, and treat it as the point of this mission rather than a failure of it.

### Decide whether to launch

Nothing to type here. You have the evidence. The judgment is yours, and there are three questions to answer.

* Does this go live? Decide on what the scorecard shows, not on how much work it took to get here.  
* What would you fix first? Pick the single failure or weakness that worries you most, and be able to say why it is that one and not another.  
* What would you monitor after launch? Name the thing you would want to be told about on the day it starts going wrong.

### What you built

At the start of this lab you could not say what you were running.

* You found what was actually there: a marketing agent nobody had catalogued, and two agents sharing one login.  
* You fixed it: one identity per agent, access cut back to what each job genuinely needs, and every read of customer data traceable to exactly one agent.  
* You controlled the connections: the back-office margin agent now names the price-match agent as its one permitted caller, and the rogue login that used to reach it is refused.  
* You screened the content: manipulation aimed at the price-match agent is stopped at the door, in front of that one agent and no other.  
* You measured it: a scored, per-scenario record of how the agent actually behaves, with the reasoning behind every verdict.

Visible, attributable, access-controlled, screened at the price-match agent's door and measured — and you got there by describing what you wanted in plain English.

What carries back to your own estate is not the commands. It is the habit: ask what is actually running, insist on evidence rather than assurance, and measure the thing before you trust it.

[image1]: <![Screenshot 1](images/extracted_screenshot_1.png)>

[image2]: <![Screenshot 2](images/extracted_screenshot_2.png)>

[image3]: <![Screenshot 3](images/extracted_screenshot_3.png)>

[image4]: <![Screenshot 4](images/extracted_screenshot_4.png)>

[image5]: <![Screenshot 5](images/extracted_screenshot_5.png)>

[image6]: <![Screenshot 6](images/extracted_screenshot_6.png)>

[image7]: <![Screenshot 7](images/extracted_screenshot_7.png)>

[image8]: <![Screenshot 8](images/extracted_screenshot_8.png)>

[image9]: <![Screenshot 9](images/extracted_screenshot_9.png)>

[image10]: <![Screenshot 10](images/extracted_screenshot_10.png)>

[image11]: <![Screenshot 11](images/extracted_screenshot_11.png)>

[image12]: <![Screenshot 12](images/extracted_screenshot_12.png)>

[image13]: <![Screenshot 13](images/extracted_screenshot_13.png)>

[image14]: <![Screenshot 14](images/extracted_screenshot_14.png)>

[image15]: <![Screenshot 15](images/extracted_screenshot_15.png)>

[image16]: <![Screenshot 16](images/extracted_screenshot_16.png)>

[image17]: <![Screenshot 17](images/extracted_screenshot_17.png)>

[image18]: <![Screenshot 18](images/extracted_screenshot_18.png)>

[image19]: <![Screenshot 19](images/extracted_screenshot_19.png)>

[image20]: <![Screenshot 20](images/extracted_screenshot_20.png)>

[image21]: <![Screenshot 21](images/extracted_screenshot_21.png)>

[image22]: <![Screenshot 22](images/extracted_screenshot_22.png)>

[image23]: <![Screenshot 23](images/extracted_screenshot_23.png)>

[image24]: <![Screenshot 24](images/extracted_screenshot_24.png)>

[image25]: <![Screenshot 25](images/extracted_screenshot_25.png)>

[image26]: <![Screenshot 26](images/extracted_screenshot_26.png)>

[image27]: <![Screenshot 27](images/extracted_screenshot_27.png)>

[image28]: <![Screenshot 28](images/extracted_screenshot_28.png)>

[image29]: <![Screenshot 29](images/extracted_screenshot_29.png)>

[image30]: <![Screenshot 30](images/extracted_screenshot_30.png)>

[image31]: <![Screenshot 31](images/extracted_screenshot_31.png)>

[image32]: <![Screenshot 32](images/extracted_screenshot_32.png)>

[image33]: <![Screenshot 33](images/extracted_screenshot_33.png)>

[image34]: <![Screenshot 34](images/extracted_screenshot_34.png)>

[image35]: <![Screenshot 35](images/extracted_screenshot_35.png)>
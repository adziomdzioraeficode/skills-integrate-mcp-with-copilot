document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  const membersList = document.getElementById("members-list");
  const memberForm = document.getElementById("member-form");
  const memberMessageDiv = document.getElementById("member-message");
  const memberFormTitle = document.getElementById("member-form-title");
  const memberSubmitBtn = document.getElementById("member-submit-btn");
  const memberCancelBtn = document.getElementById("member-cancel-btn");
  const memberEmailInput = document.getElementById("member-email");
  const memberNameInput = document.getElementById("member-name");
  const memberGradeInput = document.getElementById("member-grade");

  let editingMemberEmail = null;

  function showMessage(targetDiv, text, type) {
    targetDiv.textContent = text;
    targetDiv.className = type;
    targetDiv.classList.remove("hidden");

    setTimeout(() => {
      targetDiv.classList.add("hidden");
    }, 5000);
  }

  function resetMemberForm() {
    editingMemberEmail = null;
    memberForm.reset();
    memberEmailInput.disabled = false;
    memberFormTitle.textContent = "Add Member";
    memberSubmitBtn.textContent = "Create Member";
    memberCancelBtn.classList.add("hidden");
  }

  function setMemberEditMode(email, member) {
    editingMemberEmail = email;
    memberEmailInput.value = email;
    memberNameInput.value = member.name;
    memberGradeInput.value = member.grade_level;
    memberEmailInput.disabled = true;
    memberFormTitle.textContent = "Edit Member";
    memberSubmitBtn.textContent = "Update Member";
    memberCancelBtn.classList.remove("hidden");
  }

  async function fetchMembers() {
    try {
      const response = await fetch("/members");
      const members = await response.json();

      membersList.innerHTML = "";
      const entries = Object.entries(members);

      if (entries.length === 0) {
        membersList.innerHTML = "<p>No members yet.</p>";
        return;
      }

      entries
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([email, member]) => {
          const memberCard = document.createElement("div");
          memberCard.className = "member-card";

          memberCard.innerHTML = `
            <p><strong>${member.name}</strong></p>
            <p>${email}</p>
            <p>Grade: ${member.grade_level}</p>
            <div class="member-actions">
              <button class="edit-member-btn" data-email="${email}" type="button">Edit</button>
              <button class="delete-member-btn" data-email="${email}" type="button">Delete</button>
            </div>
          `;

          membersList.appendChild(memberCard);
        });

      document.querySelectorAll(".edit-member-btn").forEach((button) => {
        button.addEventListener("click", () => {
          const email = button.getAttribute("data-email");
          setMemberEditMode(email, members[email]);
        });
      });

      document.querySelectorAll(".delete-member-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          const email = button.getAttribute("data-email");

          try {
            const response = await fetch(`/members/${encodeURIComponent(email)}`, {
              method: "DELETE",
            });
            const result = await response.json();

            if (response.ok) {
              showMessage(memberMessageDiv, result.message, "success");
              if (editingMemberEmail === email) {
                resetMemberForm();
              }
              fetchMembers();
              fetchActivities();
            } else {
              showMessage(memberMessageDiv, result.detail || "Failed to delete member", "error");
            }
          } catch (error) {
            showMessage(memberMessageDiv, "Failed to delete member. Please try again.", "error");
            console.error("Error deleting member:", error);
          }
        });
      });
    } catch (error) {
      membersList.innerHTML = "<p>Failed to load members. Please try again later.</p>";
      console.error("Error fetching members:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(messageDiv, result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  memberForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = memberEmailInput.value.trim().toLowerCase();
    const payload = {
      name: memberNameInput.value.trim(),
      grade_level: memberGradeInput.value.trim(),
    };

    try {
      let response;

      if (editingMemberEmail) {
        response = await fetch(`/members/${encodeURIComponent(editingMemberEmail)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/members", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, ...payload }),
        });
      }

      const result = await response.json();

      if (response.ok) {
        showMessage(memberMessageDiv, result.message, "success");
        resetMemberForm();
        fetchMembers();
      } else {
        showMessage(memberMessageDiv, result.detail || "Failed to save member", "error");
      }
    } catch (error) {
      showMessage(memberMessageDiv, "Failed to save member. Please try again.", "error");
      console.error("Error saving member:", error);
    }
  });

  memberCancelBtn.addEventListener("click", () => {
    resetMemberForm();
  });

  // Initialize app
  fetchActivities();
  fetchMembers();
});

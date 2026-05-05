document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
  loadAIStats();
});

async function loadLeaderboard() {
  try {
      const response = await fetch('/leaderboard-data');
      const users = await response.json();
      const tbody = document.getElementById('leaderboard-body');
      tbody.innerHTML = '';

      if (users.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center">No players yet. Go play a game!</td></tr>';
          return;
      }

      // Sort users by highest wins
      users.sort((a, b) => b.stats.wins - a.stats.wins);

      users.forEach((user, index) => {
          const totalGames = user.stats.wins + user.stats.losses + user.stats.draws;
          const winRate = totalGames > 0 ? ((user.stats.wins / totalGames) * 100).toFixed(1) + '%' : '0%';

          tbody.innerHTML += `
              <tr>
                  <td><strong>#${index + 1}</strong></td>
                  <td>${user.username}</td>
                  <td class="text-success">${user.stats.wins}</td>
                  <td class="text-danger">${user.stats.losses}</td>
                  <td class="text-secondary">${user.stats.draws}</td>
                  <td class="fw-bold">${winRate}</td>
              </tr>
          `;
      });
  } catch (error) {
      console.error("Error fetching leaderboard:", error);
      document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load data.</td></tr>';
  }
}

async function loadAIStats() {
  try {
      const response = await fetch('/ai-stats-data');
      const aiData = await response.json();
      const container = document.getElementById('ai-stats-container');
      container.innerHTML = '';

      if (Object.keys(aiData).length === 0) {
          container.innerHTML = '<div class="alert alert-info">No AI games have been played yet.</div>';
          return;
      }

      // Loop through Difficulties (Easy, Hard, Llama)
      for (const difficulty in aiData) {
          let diffHtml = `<h5 class="mt-4 text-uppercase text-primary border-bottom pb-1">${difficulty}</h5>`;
          const personalities = aiData[difficulty];

          // Loop through Personalities within that Difficulty
          for (const personality in personalities) {
              const stats = personalities[personality];
              const totalGames = stats.wins + stats.losses + stats.draws;
              const winRate = totalGames > 0 ? ((stats.wins / totalGames) * 100).toFixed(1) + '%' : '0%';

              diffHtml += `
                  <div class="card stat-card shadow-sm mb-3">
                      <div class="card-body d-flex justify-content-between align-items-center">
                          <div>
                              <h6 class="card-title text-capitalize mb-1">${personality} Personality</h6>
                              <small class="text-muted">
                                  <span class="text-success fw-bold">W: ${stats.wins}</span> | 
                                  <span class="text-danger">L: ${stats.losses}</span> | 
                                  <span class="text-secondary">D: ${stats.draws}</span>
                              </small>
                          </div>
                          <div class="text-end">
                              <span class="badge bg-primary fs-6">${winRate} Win Rate</span><br>
                              <small class="text-muted" style="font-size: 0.75rem;">Total Games: ${totalGames}</small>
                          </div>
                      </div>
                  </div>
              `;
          }
          container.innerHTML += diffHtml;
      }
  } catch (error) {
      console.error("Error fetching AI stats:", error);
      document.getElementById('ai-stats-container').innerHTML = '<div class="alert alert-danger">Failed to load AI data.</div>';
  }
}
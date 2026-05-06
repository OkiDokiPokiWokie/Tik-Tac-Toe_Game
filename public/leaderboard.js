<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tic-Tac-Toe Stats & Leaderboard</title>
    <link href="bootstrap-5.3.8-dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">

    <script>
        const savedTheme = localStorage.getItem('tictactoe-theme') || 'classic';
        document.documentElement.setAttribute('data-theme', savedTheme);
    </script>

    <style>
        body {
            padding-top: 2rem;
            transition: background-color 0.3s ease, color 0.3s ease;
            background-color: var(--bg-color, #f8f9fa);
            color: var(--text-color, #212529);
        }
        .themed-container {
            background-color: var(--card-bg, #ffffff);
            border-radius: 8px;
            padding: 20px;
        }
        .theme-table {
            color: var(--text-color, #212529) !important;
        }
        .theme-table thead th {
            background-color: var(--table-header-bg, #212529);
            color: var(--table-header-text, #ffffff);
        }
    </style>
</head>
<body data-theme="classic">

<div class="container themed-container shadow-sm mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <h1 class="title-text">🏆 Stats & Leaderboard</h1>
        <a href="/game.html" class="btn btn-outline-primary theme-btn">Back to Game</a>
    </div>

    <div class="row">
        <div class="col-md-6 mb-4">
            <h3 class="mb-3">🤖 AI Performance</h3>
            <div id="ai-stats-container">
                <div class="text-center mt-5">
                    <div class="spinner-border spinner-border-sm" role="status"></div>
                    Loading AI Data...
                </div>
            </div>
        </div>

        <div class="col-md-6 mb-4">
            <h3 class="mb-3">🌍 Global Leaderboard</h3>
            <div class="table-responsive shadow-sm rounded">
                <table class="table theme-table mb-0">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>W</th>
                            <th>L</th>
                            <th>D</th>
                            <th>Win %</th>
                        </tr>
                    </thead>
                    <tbody id="leaderboard-body">
                        <tr>
                            <td colspan="6" class="text-center">
                                <div class="spinner-border spinner-border-sm" role="status"></div>
                                Loading Leaderboard...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script src="bootstrap-5.3.8-dist/js/bootstrap.bundle.min.js"></script>
<script src="leaderboard.js"></script>
</body>
</html>
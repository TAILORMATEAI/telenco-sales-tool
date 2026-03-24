export default async function handler(req: any, res: any) {
  // Alleen POST requests toestaan
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const githubToken = process.env.GITHUB_PAT;

  if (!githubToken) {
    return res.status(500).json({ error: 'GitHub PAT is not configured in Vercel environment variables.' });
  }

  // De eigenaar en repo naam
  const owner = 'TAILORMATEAI';
  const repo = 'telenco-sales-tool';
  const workflowId = 'scrape-elindus.yml';

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main', // De branch waarop de workflow runt
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API reageerde met status ${response.status}: ${errorText}`);
    }

    return res.status(200).json({ success: true, message: 'GitHub Action is succesvol gestart.' });
  } catch (error: any) {
    console.error('Fout bij het triggeren van GitHub Action:', error);
    return res.status(500).json({ error: 'Kan de GitHub Action niet starten.', details: error.message });
  }
}

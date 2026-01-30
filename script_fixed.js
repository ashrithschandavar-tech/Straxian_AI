// Fixed generateAdaptedTimetable function
async function generateAdaptedTimetable(analysis, problemReason) {
    if (!currentPlanData || !currentPlanData.timetable) {
        alert('No timetable found to adjust.');
        return;
    }
    
    const currentTimetable = currentPlanData.timetable;
    const goalTitle = currentPlanData.title || 'Goal';
    
    try {
        const prompt = `You are an AI coach. The user is struggling with their goal: "${goalTitle}"

CURRENT TIMETABLE:
${currentTimetable.map(slot => `${slot.time} - ${slot.task}`).join('\n')}

PROGRESS ANALYSIS:
- Completion Rate: ${analysis.completionRate.toFixed(1)}%
- Missed Days: ${analysis.missedDays}

USER'S PROBLEM: "${problemReason}"

Based on their specific problem, adapt the timetable to be more realistic and achievable. Address their exact issue.

Return ONLY a JSON object:
{
  "timetable": [{"time": "08:00 AM", "task": "Adapted Activity"}, ...],
  "explanation": "How this addresses your specific problem"
}`;
        
        showTimetableMessage('Updating...', 'info');
        
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        
        if (!response.ok) throw new Error('Failed to generate adapted timetable');
        const result = await response.json();
        
        if (result.timetable && result.timetable.length > 0) {
            currentPlanData.timetable = result.timetable;
            renderTimetable(result.timetable);
            await saveTimetableState();
            
            showTimetableMessage('Done!', 'success');
            setTimeout(() => {
                const messageDiv = document.getElementById('timetable-message');
                if (messageDiv) messageDiv.remove();
            }, 2000);
        } else {
            throw new Error('AI could not generate a valid adapted timetable');
        }
    } catch (error) {
        console.error('Adapted timetable generation error:', error);
        showTimetableMessage('Error: ' + error.message, 'error');
    }
}
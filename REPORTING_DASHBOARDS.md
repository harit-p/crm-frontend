# Reporting Dashboards - Complete Guide

## Overview

The CRM system now includes comprehensive reporting dashboards with 7 key analytics views:

1. **Pipeline Summary** - Overview of deals by stage
2. **Revenue Forecast** - Weighted revenue projections
3. **Top Opportunities** - Best deals ranked by value
4. **Tasks Due Today / Overdue** - Task management dashboard
5. **Lead Source Effectiveness** - Performance by lead source
6. **Rep Performance Scorecard** - Sales rep metrics
7. **Product Category Demand Breakdown** - Product interest analysis

---

## 1. Pipeline Summary

### What It Shows
- Count of opportunities by stage
- Total active deals
- Total closed deals
- Total deals across all stages

### Key Metrics
- **Active Deals**: All opportunities not in Closed Won/Lost
- **Closed Deals**: Sum of Closed Won + Closed Lost
- **By Stage**: Breakdown showing count for each pipeline stage

### Use Cases
- Quick overview of pipeline health
- Identify bottlenecks in specific stages
- Track deal distribution across pipeline

---

## 2. Revenue Forecast

### What It Shows
- Total weighted revenue forecast (sum of all weighted values)
- Forecast by stage (weighted revenue per stage)
- Number of deals contributing to each stage forecast

### Calculation
- **Weighted Forecast** = Revenue × Probability
- Uses stage-specific probabilities or custom probabilities from opportunities
- Only includes opportunities with revenue values

### Revenue Priority
The system uses the following priority for revenue values:
1. Final Deal Value (if available)
2. Updated Quote (if available)
3. Proposal Amount (if available)
4. Estimated Revenue (if available)

### Use Cases
- Financial planning and forecasting
- Identify high-value stages
- Track forecast trends over time

---

## 3. Top Opportunities

### What It Shows
- Top N opportunities ranked by weighted value
- Shows: Opportunity name, stage, owner, revenue, probability, weighted value
- Default: Top 10 (configurable)

### Ranking
- Sorted by **Weighted Value** (Revenue × Probability) in descending order
- Only includes opportunities with revenue > 0
- Excludes Closed Lost opportunities

### Use Cases
- Focus on highest-value deals
- Identify deals needing attention
- Track top performers

---

## 4. Tasks Due Today / Overdue

### What It Shows
- **Due Today**: Tasks with due date = today
- **Overdue**: Tasks past their due date
- Shows: Task subject, owner, days overdue (for overdue tasks)

### Filters
- Excludes completed tasks
- Sorted by urgency (most overdue first)

### Use Cases
- Daily task management
- Identify urgent items
- Track task completion rates

---

## 5. Lead Source Effectiveness

### What It Shows
- Performance metrics by lead source
- Metrics include:
  - Total opportunities
  - Closed Won count
  - Closed Lost count
  - Win Rate (%)
  - Total Revenue (from won deals)

### Calculations
- **Win Rate** = (Closed Won / Total) × 100
- **Loss Rate** = (Closed Lost / Total) × 100
- **Total Revenue** = Sum of Final Deal Value from Closed Won deals

### Use Cases
- Identify best-performing lead sources
- Optimize marketing spend
- Focus on high-converting sources

---

## 6. Rep Performance Scorecard

### What It Shows
- Performance metrics for each sales rep
- Metrics include:
  - Total Opportunities
  - Active Opportunities
  - Closed Won count
  - Closed Lost count
  - Win Rate (%)
  - Total Revenue (from won deals)
  - Weighted Forecast (active deals)

### Calculations
- **Win Rate** = (Closed Won / Total Opportunities) × 100
- **Loss Rate** = (Closed Lost / Total Opportunities) × 100
- **Avg Deal Size** = Total Revenue / Closed Won (if any)
- **Weighted Forecast** = Sum of (Revenue × Probability) for active deals

### Use Cases
- Performance reviews
- Identify top performers
- Training needs identification
- Commission calculations

---

## 7. Product Category Demand Breakdown

### What It Shows
- Demand analysis by product category
- Metrics include:
  - Total Opportunities
  - Active Opportunities
  - Closed Won count
  - Closed Won Revenue
  - Total Revenue
  - Average Revenue per Opportunity

### Data Sources
- Primary: "Required Product Categories" field (comma-separated)
- Fallback: "Interest Type" field if categories not available

### Calculations
- **Total Revenue** = Sum of all revenue values (won + active)
- **Closed Won Revenue** = Sum of Final Deal Value from Closed Won deals
- **Average Revenue** = Total Revenue / Count
- **Average Won Revenue** = Closed Won Revenue / Closed Won Count

### Use Cases
- Product planning
- Inventory management
- Marketing focus areas
- Identify high-demand products

---

## API Endpoints

### Get All Reports
```
GET /api?action=getAllReports&token={token}
```
Returns all 7 reports in one call (recommended for dashboard)

### Individual Report Endpoints

#### Pipeline Summary
```
GET /api?action=getPipelineSummary&token={token}
```

#### Revenue Forecast
```
GET /api?action=getRevenueForecast&token={token}
```

#### Top Opportunities
```
GET /api?action=getTopOpportunities&limit=10&token={token}
```
- `limit` parameter: Number of top opportunities to return (default: 10)

#### Tasks Due Today / Overdue
```
GET /api?action=getTasksDueTodayOverdue&token={token}
```

#### Lead Source Effectiveness
```
GET /api?action=getLeadSourceEffectiveness&token={token}
```

#### Rep Performance Scorecard
```
GET /api?action=getRepPerformanceScorecard&token={token}
```

#### Product Category Demand
```
GET /api?action=getProductCategoryDemand&token={token}
```

---

## Frontend Usage

### Accessing Analytics Dashboard

1. Navigate to `/analytics` route
2. Available to users with `view_analytics` permission
3. Default access: Exec, Ops/Management roles

### Dashboard Features

- **Auto-refresh**: Click "Refresh" button to update all reports
- **Real-time data**: All reports fetch latest data from database
- **Responsive design**: Works on desktop and mobile
- **Visual indicators**: Color-coded metrics for quick scanning

### Navigation

- Analytics link appears in sidebar for users with `view_analytics` permission
- Can also access directly via `/analytics` URL

---

## Data Requirements

### For Accurate Reports

1. **Revenue Fields**: Ensure opportunities have revenue values populated
   - Estimated Revenue (Qualified Opportunity stage)
   - Proposal Amount (Proposal Sent stage)
   - Updated Quote (Negotiation stage)
   - Final Deal Value (Verbal Win / Closed Won stages)

2. **Lead Source**: Populate "Lead Source" field for all opportunities

3. **Product Categories**: 
   - Use "Required Product Categories" field (comma-separated)
   - Or "Interest Type" field as fallback

4. **Assigned Rep**: Ensure "Assigned Rep" field is populated

5. **Task Due Dates**: Set due dates for tasks to track overdue items

6. **Stage Updates**: Keep opportunities updated to latest stage

---

## Performance Considerations

### Optimization Tips

1. **Use getAllReports**: Single API call is more efficient than 7 separate calls
2. **Caching**: Consider caching report data for 5-15 minutes
3. **Filtering**: Reports automatically filter out Closed Lost where appropriate
4. **Indexing**: Google Sheets automatically indexes data for fast lookups

### Large Datasets

- Reports are optimized for datasets up to 10,000+ records
- For very large datasets, consider:
  - Filtering by date range
  - Limiting to active opportunities only
  - Using pagination for Top Opportunities

---

## Customization

### Modifying Report Calculations

All report functions are in `backend_code.gs`:

- `getPipelineSummary()` - Pipeline summary logic
- `getRevenueForecast()` - Revenue forecast calculations
- `getTopOpportunities(limit)` - Top opportunities ranking
- `getTasksDueTodayOverdue()` - Task filtering
- `getLeadSourceEffectiveness()` - Lead source analysis
- `getRepPerformanceScorecard()` - Rep performance metrics
- `getProductCategoryDemand()` - Product category analysis

### Adding New Reports

1. Create new function in `backend_code.gs`
2. Add API endpoint in `doGet()` function
3. Add frontend API call in `api.js`
4. Create dashboard card component in `AnalyticsDashboard.jsx`
5. Add to `getAllReportsData()` function

---

## Troubleshooting

### Reports Show No Data

1. **Check Data**: Ensure opportunities/tasks exist in database
2. **Check Fields**: Verify required fields are populated
3. **Check Permissions**: Ensure user has `view_analytics` permission
4. **Check API**: Verify API endpoint is accessible

### Incorrect Calculations

1. **Revenue Values**: Check which revenue field is being used
2. **Probability**: Verify Forecast Probability values are correct
3. **Stage Names**: Ensure stage names match exactly (case-sensitive)
4. **Date Formats**: Verify date fields are properly formatted

### Performance Issues

1. **Reduce Data**: Filter to active opportunities only
2. **Cache Results**: Implement client-side caching
3. **Optimize Queries**: Review report function logic
4. **Limit Results**: Use limit parameter for Top Opportunities

---

## Best Practices

1. **Regular Updates**: Keep opportunity data up-to-date for accurate forecasts
2. **Data Quality**: Ensure all required fields are populated
3. **Review Frequency**: Review reports weekly/monthly for trends
4. **Action Items**: Use reports to identify action items and follow up
5. **Historical Tracking**: Compare reports over time to identify trends

---

## Future Enhancements

Potential additions:
- Date range filtering
- Export to PDF/Excel
- Scheduled email reports
- Custom report builder
- Chart visualizations
- Trend analysis
- Comparative reports (period over period)

---

## Support

For issues or questions:
1. Check execution logs in Apps Script editor
2. Review error messages in API responses
3. Verify data quality in Google Sheets
4. Test individual report endpoints


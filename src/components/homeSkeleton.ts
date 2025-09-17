/**
 * Home page skeleton screen component
 * Creates a wireframe-like layout inspired by the project management interface
 * Based on Nielsen Norman Group skeleton screen guidelines
 */

import { 
  createSkeletonLine, 
  createSkeletonRect, 
  createSkeletonCircle 
} from './skeletonComponents';

export function createHomeSkeleton(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'skeleton-home';

  // Project Overview Header Section
  const header = document.createElement('div');
  header.className = 'skeleton-home__header';

  // Project title and status
  const titleSection = document.createElement('div');
  titleSection.className = 'skeleton-home__title-section';
  
  const projectTitle = createSkeletonLine({ width: '12rem', height: '1.5rem' });
  const statusBadge = createSkeletonRect({ width: '4rem', height: '1.5rem', className: 'skeleton-home__status-badge' });
  
  titleSection.appendChild(projectTitle);
  titleSection.appendChild(statusBadge);
  header.appendChild(titleSection);

  // Address and clock-in info
  const infoLines = document.createElement('div');
  infoLines.className = 'skeleton-home__info-lines';
  
  const addressLine = createSkeletonLine({ width: '16rem', height: '1rem' });
  const clockInLine = createSkeletonLine({ width: '14rem', height: '1rem' });
  const actionLink = createSkeletonLine({ width: '8rem', height: '1rem', className: 'skeleton-home__action-link' });
  
  infoLines.appendChild(addressLine);
  infoLines.appendChild(clockInLine);
  infoLines.appendChild(actionLink);
  header.appendChild(infoLines);

  // People section (clients and project managers)
  const peopleSection = document.createElement('div');
  peopleSection.className = 'skeleton-home__people-section';

  // Clients group
  const clientsGroup = document.createElement('div');
  clientsGroup.className = 'skeleton-home__people-group';
  
  const clientsLabel = createSkeletonLine({ width: '3rem', height: '1rem' });
  const clientsAvatars = document.createElement('div');
  clientsAvatars.className = 'skeleton-home__people-avatars';
  
  const clientAvatar = createSkeletonCircle({ width: '2.5rem', height: '2.5rem' });
  clientsAvatars.appendChild(clientAvatar);
  
  clientsGroup.appendChild(clientsLabel);
  clientsGroup.appendChild(clientsAvatars);
  peopleSection.appendChild(clientsGroup);

  // Project managers group
  const managersGroup = document.createElement('div');
  managersGroup.className = 'skeleton-home__people-group';
  
  const managersLabel = createSkeletonLine({ width: '6rem', height: '1rem' });
  const managersAvatars = document.createElement('div');
  managersAvatars.className = 'skeleton-home__people-avatars';
  
  const managerAvatar1 = createSkeletonCircle({ width: '2rem', height: '2rem' });
  const managerAvatar2 = createSkeletonCircle({ width: '2rem', height: '2rem' });
  managersAvatars.appendChild(managerAvatar1);
  managersAvatars.appendChild(managerAvatar2);
  
  managersGroup.appendChild(managersLabel);
  managersGroup.appendChild(managersAvatars);
  peopleSection.appendChild(managersGroup);

  header.appendChild(peopleSection);
  container.appendChild(header);

  // Main content area
  const mainContent = document.createElement('div');
  mainContent.className = 'skeleton-home__main-content';

  // Central panel
  const centralPanel = document.createElement('div');
  centralPanel.className = 'skeleton-home__central-panel';

  // Task overview section
  const taskOverview = document.createElement('div');
  taskOverview.className = 'skeleton-home__task-overview';

  // Past due column
  const pastDueColumn = document.createElement('div');
  pastDueColumn.className = 'skeleton-home__task-column';
  const pastDueHeader = createSkeletonLine({ width: '4rem', height: '1rem' });
  pastDueColumn.appendChild(pastDueHeader);
  taskOverview.appendChild(pastDueColumn);

  // Due today column
  const dueTodayColumn = document.createElement('div');
  dueTodayColumn.className = 'skeleton-home__task-column';
  const dueTodayHeader = createSkeletonLine({ width: '5rem', height: '1rem' });
  const thumbsUpIcon = createSkeletonRect({ width: '3rem', height: '3rem', className: 'skeleton-home__task-icon' });
  const motivationalMessage = createSkeletonLine({ width: '8rem', height: '1rem' });
  
  dueTodayColumn.appendChild(dueTodayHeader);
  dueTodayColumn.appendChild(thumbsUpIcon);
  dueTodayColumn.appendChild(motivationalMessage);
  taskOverview.appendChild(dueTodayColumn);

  // Action items column
  const actionItemsColumn = document.createElement('div');
  actionItemsColumn.className = 'skeleton-home__task-column';
  const actionItemsHeader = createSkeletonLine({ width: '6rem', height: '1rem' });
  actionItemsColumn.appendChild(actionItemsHeader);
  taskOverview.appendChild(actionItemsColumn);

  centralPanel.appendChild(taskOverview);

  // Recent activity section
  const activitySection = document.createElement('div');
  activitySection.className = 'skeleton-home__activity-section';

  const activityHeader = document.createElement('div');
  activityHeader.className = 'skeleton-home__activity-header';
  
  const activityTitle = createSkeletonLine({ width: '12rem', height: '1.25rem' });
  const activityFilter = createSkeletonRect({ width: '3rem', height: '2rem', className: 'skeleton-home__activity-filter' });
  
  activityHeader.appendChild(activityTitle);
  activityHeader.appendChild(activityFilter);
  activitySection.appendChild(activityHeader);

  const activityList = document.createElement('div');
  activityList.className = 'skeleton-home__activity-list';

  // Activity date separator
  const activityDate = createSkeletonLine({ width: '6rem', height: '1.25rem', className: 'skeleton-home__activity-date' });
  activityList.appendChild(activityDate);

  // Activity items
  const activityItems = document.createElement('div');
  activityItems.className = 'skeleton-home__activity-items';

  // Create 3 activity items
  for (let i = 0; i < 3; i++) {
    const activityItem = document.createElement('div');
    activityItem.className = 'skeleton-home__activity-item';

    const avatar = createSkeletonCircle({ width: '2rem', height: '2rem', className: 'skeleton-home__activity-avatar' });
    const content = document.createElement('div');
    content.className = 'skeleton-home__activity-content';

    const primaryLine = createSkeletonLine({ width: '14rem', height: '1rem' });
    const actionLine = createSkeletonLine({ width: '10rem', height: '0.875rem' });
    
    // Add a third line for some items
    if (i < 2) {
      const detailLine = createSkeletonLine({ width: '8rem', height: '0.875rem' });
      content.appendChild(detailLine);
    }

    content.appendChild(primaryLine);
    content.appendChild(actionLine);

    activityItem.appendChild(avatar);
    activityItem.appendChild(content);
    activityItems.appendChild(activityItem);
  }

  activityList.appendChild(activityItems);
  activitySection.appendChild(activityList);
  centralPanel.appendChild(activitySection);

  mainContent.appendChild(centralPanel);

  // Right sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'skeleton-home__sidebar';

  // Updates section
  const updatesSection = document.createElement('div');
  updatesSection.className = 'skeleton-home__updates-section';

  const updatesMetric = createSkeletonRect({ width: '4rem', height: '4rem', className: 'skeleton-home__updates-metric' });
  const updatesDescription = createSkeletonLine({ width: '10rem', height: '1rem' });
  
  const updatesActions = document.createElement('div');
  updatesActions.className = 'skeleton-home__updates-actions';
  const clientUpdatesBtn = createSkeletonRect({ width: '5rem', height: '2rem' });
  const dailyLogsBtn = createSkeletonRect({ width: '4rem', height: '2rem' });
  updatesActions.appendChild(clientUpdatesBtn);
  updatesActions.appendChild(dailyLogsBtn);

  updatesSection.appendChild(updatesMetric);
  updatesSection.appendChild(updatesDescription);
  updatesSection.appendChild(updatesActions);
  sidebar.appendChild(updatesSection);

  // Agenda section
  const agendaSection = document.createElement('div');
  agendaSection.className = 'skeleton-home__agenda-section';

  const agendaHeader = document.createElement('div');
  agendaHeader.className = 'skeleton-home__agenda-header';
  
  const agendaTitle = createSkeletonLine({ width: '8rem', height: '1.25rem' });
  const agendaLink = createSkeletonLine({ width: '6rem', height: '1rem', className: 'skeleton-home__agenda-link' });
  
  agendaHeader.appendChild(agendaTitle);
  agendaHeader.appendChild(agendaLink);
  agendaSection.appendChild(agendaHeader);

  const agendaList = document.createElement('div');
  agendaList.className = 'skeleton-home__agenda-list';

  // Create agenda items for the week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  for (let i = 0; i < days.length; i++) {
    const agendaItem = document.createElement('div');
    agendaItem.className = 'skeleton-home__agenda-item';

    const dateIndicator = createSkeletonRect({ width: '2rem', height: '2rem', className: 'skeleton-home__agenda-date' });
    const content = document.createElement('div');
    content.className = 'skeleton-home__agenda-content';

    const dayLine = createSkeletonLine({ width: '4rem', height: '1rem' });
    const dateLine = createSkeletonLine({ width: '3rem', height: '0.875rem' });
    
    content.appendChild(dayLine);
    content.appendChild(dateLine);

    // Add non-workday indicator for weekend
    if (i >= 5) {
      const nonWorkdayLine = createSkeletonLine({ width: '5rem', height: '0.75rem' });
      content.appendChild(nonWorkdayLine);
    }

    agendaItem.appendChild(dateIndicator);
    agendaItem.appendChild(content);
    agendaList.appendChild(agendaItem);
  }

  agendaSection.appendChild(agendaList);
  sidebar.appendChild(agendaSection);

  mainContent.appendChild(sidebar);
  container.appendChild(mainContent);

  return container;
}

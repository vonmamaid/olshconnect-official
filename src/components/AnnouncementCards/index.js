import React from 'react';
import styled from 'styled-components';

const COLORS = {
  primary: '#c70202',
  primaryDark: '#9e0202',
  text: '#1a1a1a',
  textMuted: '#555',
  white: '#ffffff',
  cardBg: '#ffffff',
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowHover: 'rgba(199, 2, 2, 0.15)',
};

const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
  padding: 1.25rem 1rem;
  width: min(1200px, 100%);
  margin: 0 auto;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`;

const Card = styled.article`
  grid-column: span 4;
  min-height: 220px;
  background: ${COLORS.cardBg};
  border-radius: 12px;
  box-shadow: 0 4px 20px ${COLORS.shadow};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px ${COLORS.shadowHover};
  }

  &:nth-child(1) {
    grid-column: span 6;
    grid-row: span 2;
    min-height: 320px;
  }

  &:nth-child(2),
  &:nth-child(5),
  &:nth-child(8) {
    grid-column: span 6;
  }

  @media (max-width: 1024px) {
    grid-column: span 4;

    &:nth-child(1) {
      grid-column: span 8;
      grid-row: span 1;
      min-height: 280px;
    }

    &:nth-child(2),
    &:nth-child(5),
    &:nth-child(8) {
      grid-column: span 4;
    }
  }

  @media (max-width: 768px) {
    grid-column: span 4;
    min-height: auto;

    &:nth-child(1),
    &:nth-child(2),
    &:nth-child(5),
    &:nth-child(8) {
      grid-column: span 4;
      grid-row: span 1;
      min-height: auto;
    }
  }
`;

const CardAccent = styled.div`
  height: 4px;
  background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryDark});
  width: 100%;
`;

const CardBody = styled.div`
  padding: 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.35rem;
`;

const MediaWrap = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #f2f2f2;
  border-bottom: 1px solid #eee;
  overflow: hidden;
`;

const MediaImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const MediaVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const MediaFile = styled.a`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${COLORS.primary};
  text-decoration: none;
  font-weight: 600;
  padding: 0.75rem;
  text-align: center;

  &:hover {
    color: ${COLORS.primaryDark};
    text-decoration: underline;
  }
`;

const CardDate = styled.span`
  font-size: 0.8rem;
  color: ${COLORS.primary};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.5rem;
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${COLORS.text};
  margin: 0 0 0.75rem 0;
  line-height: 1.3;
`;

const CardDescription = styled.p`
  font-size: 0.95rem;
  color: ${COLORS.textMuted};
  line-height: 1.55;
  margin: 0 0 1.25rem 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;

  ${Card}:nth-child(1) & {
    -webkit-line-clamp: 7;
  }
`;

const ReadMoreLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.25rem;
  background: ${COLORS.primary};
  color: ${COLORS.white};
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.1s ease;
  align-self: flex-start;

  &:hover {
    background: ${COLORS.primaryDark};
    color: ${COLORS.white};
    transform: scale(1.02);
  }
`;

const ReadMoreDisabled = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.25rem;
  background: #ccc;
  color: #666;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: not-allowed;
  align-self: flex-start;
`;

const EmptyState = styled.p`
  color: ${COLORS.white};
  width: 100%;
  text-align: center;
  font-size: 1.1rem;
  margin: 0;
`;

const LoadingState = styled.p`
  color: ${COLORS.white};
  width: 100%;
  text-align: center;
  font-size: 1rem;
  margin: 0;
  opacity: 0.9;
`;

function AnnouncementCards({ announcements, loading }) {
  const resolveMediaType = (item) => {
    if (item?.media_type) return item.media_type;
    const url = (item?.media_url || '').toLowerCase().split('?')[0].split('#')[0];
    if (!url) return '';
    if (/\.(jpg|jpeg|png|gif|webp|svg|avif)$/.test(url)) return 'image';
    if (/\.(mp4|webm|ogg|mov|m4v)$/.test(url)) return 'video';
    return 'file';
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>Loading announcements...</LoadingState>
      </Container>
    );
  }

  if (!announcements || announcements.length === 0) {
    return (
      <Container>
        <EmptyState>No announcements at the moment.</EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      {announcements.map((item) => {
        const dateStr = item.announcement_date
          ? new Date(item.announcement_date).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : '';
        return (
          <Card key={item.announcement_id}>
            <CardAccent />
            {item.media_url && (() => {
              const mediaType = resolveMediaType(item);
              if (mediaType === 'image') {
                return (
                  <MediaWrap>
                    <MediaImage src={item.media_url} alt={item.title || 'Announcement media'} loading="lazy" />
                  </MediaWrap>
                );
              }
              if (mediaType === 'video') {
                return (
                  <MediaWrap>
                    <MediaVideo controls preload="metadata">
                      <source src={item.media_url} />
                    </MediaVideo>
                  </MediaWrap>
                );
              }
              return (
                <MediaWrap>
                  <MediaFile href={item.media_url} target="_blank" rel="noopener noreferrer">
                    Open attached file
                  </MediaFile>
                </MediaWrap>
              );
            })()}
            <CardBody>
              <CardDate>{dateStr}</CardDate>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
              {item.link ? (
                <ReadMoreLink
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read More
                </ReadMoreLink>
              ) : (
                <ReadMoreDisabled>Read More</ReadMoreDisabled>
              )}
            </CardBody>
          </Card>
        );
      })}
    </Container>
  );
}

export default AnnouncementCards;

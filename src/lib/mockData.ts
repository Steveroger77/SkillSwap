import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  query, 
  limit,
  setDoc,
  doc,
  where
} from 'firebase/firestore';

const MOCK_USERS = [
  {
    name: 'Sarah Chen',
    username: 'sarah_codes',
    email: 'sarah@example.com',
    bio: 'Full-stack developer & open source enthusiast. Love teaching React!',
    avatar_url: 'https://picsum.photos/seed/sarah/200',
    location: 'San Francisco, CA'
  },
  {
    name: 'Marcus Thorne',
    username: 'marcus_design',
    email: 'marcus@example.com',
    bio: 'Product Designer at a tech startup. Minimalist at heart.',
    avatar_url: 'https://picsum.photos/seed/marcus/200',
    location: 'London, UK'
  },
  {
    name: 'Elena Rodriguez',
    username: 'elena_yoga',
    email: 'elena@example.com',
    bio: 'Yoga instructor and wellness advocate. Namaste! 🙏',
    avatar_url: 'https://picsum.photos/seed/elena/200',
    location: 'Bali, Indonesia'
  }
];

const MOCK_SKILLS = [
  { name: 'React Development', category: 'Programming' },
  { name: 'UI/UX Design', category: 'Design' },
  { name: 'Digital Marketing', category: 'Marketing' },
  { name: 'Public Speaking', category: 'Soft Skills' },
  { name: 'Photography', category: 'Creative' },
  { name: 'Data Science', category: 'Technology' },
  { name: 'Spanish Language', category: 'Languages' },
  { name: 'Yoga Instruction', category: 'Wellness' }
];

const MOCK_POSTS = [
  {
    caption: 'Just finished a deep dive into React Server Components! 🚀 #coding #react #webdev',
    location: 'San Francisco, CA',
    media: [
      { url: 'https://picsum.photos/seed/react/1080/1080', type: 'image' }
    ]
  },
  {
    caption: 'Exploring the beauty of minimalist design. Less is definitely more. ✨ #design #minimalism #uiux',
    location: 'London, UK',
    media: [
      { url: 'https://picsum.photos/seed/design/1080/1350', type: 'image' }
    ]
  },
  {
    caption: 'Morning yoga session to start the day with clarity and focus. 🧘‍♂️ #wellness #yoga #mindfulness',
    location: 'Bali, Indonesia',
    media: [
      { url: 'https://picsum.photos/seed/yoga/1080/1080', type: 'image' }
    ]
  },
  {
    caption: 'Capturing the golden hour in the city. The light was perfect today! 📸 #photography #goldenhour #cityscape',
    location: 'New York, NY',
    media: [
      { url: 'https://picsum.photos/seed/photo/1080/1080', type: 'image' }
    ]
  }
];

const MOCK_COMMENTS = [
  'This is so inspiring! Thanks for sharing.',
  'I would love to learn more about this. Do you offer sessions?',
  'Great perspective on this topic.',
  'The quality of this post is amazing! 🔥',
  'Exactly what I needed to see today.'
];

export async function seedMockData(currentUserId: string) {
  try {
    console.log('Starting mock data seeding...');

    // 1. Seed Global Skills if they don't exist or just add them
    const skillsCol = collection(db, 'skills');
    const existingSkills = await getDocs(query(skillsCol, limit(1)));
    
    let skillIds: string[] = [];
    if (existingSkills.empty) {
      console.log('Seeding global skills...');
      for (const skill of MOCK_SKILLS) {
        const docRef = await addDoc(skillsCol, {
          ...skill,
          created_at: serverTimestamp()
        });
        skillIds.push(docRef.id);
      }
    } else {
      skillIds = existingSkills.docs.map(d => d.id);
    }

    // 2. Seed Posts for the current user
    console.log('Seeding posts...');
    for (const post of MOCK_POSTS) {
      const postRef = await addDoc(collection(db, 'posts'), {
        ...post,
        user_id: currentUserId,
        created_at: serverTimestamp(),
        likes_count: Math.floor(Math.random() * 100),
        comments_count: 0
      });

      // 3. Seed some comments for each post
      console.log(`Seeding comments for post ${postRef.id}...`);
      const numComments = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numComments; i++) {
        const randomComment = MOCK_COMMENTS[Math.floor(Math.random() * MOCK_COMMENTS.length)];
        await addDoc(collection(db, 'posts', postRef.id, 'comments'), {
          content: randomComment,
          user_id: currentUserId, // For simplicity, using current user
          created_at: serverTimestamp()
        });
      }
    }

    // 4. Add some skills to the user's profile
    console.log('Adding skills to user profile...');
    if (skillIds.length > 0) {
      const userSkillsCol = collection(db, 'users', currentUserId, 'skills');
      for (let i = 0; i < 3; i++) {
        const skillId = skillIds[i % skillIds.length];
        await setDoc(doc(userSkillsCol, skillId), {
          skill_id: skillId,
          type: i % 2 === 0 ? 'know' : 'learn',
          created_at: serverTimestamp()
        });
      }
    }

    // 5. Seed other users and interactions
    console.log('Seeding other users and interactions...');
    for (const mockUser of MOCK_USERS) {
      // Create mock user profile
      const userRef = await addDoc(collection(db, 'users'), {
        ...mockUser,
        created_at: serverTimestamp()
      });
      const otherUserId = userRef.id;

      // Add skills to mock user
      const otherUserSkillsCol = collection(db, 'users', otherUserId, 'skills');
      await setDoc(doc(otherUserSkillsCol, skillIds[0]), {
        skill_id: skillIds[0],
        type: 'know',
        created_at: serverTimestamp()
      });

      // Create Swap Request
      console.log(`Creating swap request with ${mockUser.username}...`);
      await addDoc(collection(db, 'swap_requests'), {
        from_user: currentUserId,
        to_user: otherUserId,
        skill_id: skillIds[0],
        skill_name: MOCK_SKILLS[0].name,
        status: 'pending',
        created_at: serverTimestamp()
      });

      // Create Chat
      console.log(`Creating chat with ${mockUser.username}...`);
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [currentUserId, otherUserId],
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Add some messages
      console.log(`Adding messages to chat ${chatRef.id}...`);
      const messages = [
        { sender_id: otherUserId, content: `Hey! I saw you want to learn ${MOCK_SKILLS[0].name}. I can help!` },
        { sender_id: currentUserId, content: 'That would be awesome! When are you free?' },
        { sender_id: otherUserId, content: 'How about this weekend?' }
      ];

      for (const msg of messages) {
        await addDoc(collection(db, 'chats', chatRef.id, 'messages'), {
          ...msg,
          chat_id: chatRef.id,
          created_at: serverTimestamp()
        });
      }
    }

    console.log('Mock data seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding mock data:', error);
    throw error;
  }
}

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DesignerProfile {
  name: string;
  role?: string;
  background: string;
  experience: string;
  style: string;
  inspirations: string;
  education: string;
  specialties: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  logo?: string;
}

interface Props {
  onSubmit: (profile: DesignerProfile) => void;
  initialProfile?: Partial<DesignerProfile> | null;
}

const DesignerProfileForm: React.FC<Props> = ({ onSubmit, initialProfile }) => {
  const [profile, setProfile] = useState<DesignerProfile>({
    name: '',
    role: '',
    background: '',
    experience: '',
    style: '',
    inspirations: '',
    education: '',
    specialties: '',
    address: '',
    website: '',
    email: '',
    phone: '',
    instagram: '',
    twitter: '',
    tiktok: '',
    logo: ''
  });
  const [emailError, setEmailError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialProfile) {
      setProfile(prev => ({
        ...prev,
        ...initialProfile,
      } as DesignerProfile));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialProfile || {})]);

  const emailValid = useMemo(() => {
    if (!profile.email) return true;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(profile.email.trim());
  }, [profile.email]);

  const suggestedWebsite = useMemo(() => {
    const email = (profile.email || '').trim();
    if (!email || profile.website) return '';
    const at = email.indexOf('@');
    if (at === -1) return '';
    const domain = email.slice(at + 1).toLowerCase();
    // Skip common mailbox providers
    const common = ['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','proton.me','protonmail.com','aol.com','live.com'];
    if (!domain || common.includes(domain)) return '';
    return `https://${domain}`;
  }, [profile.email, profile.website]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic email validation
    if (profile.email && !emailValid) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    onSubmit(profile);
  };

  const handleChange = (field: keyof DesignerProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (field === 'email') {
      setEmailError(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Designer Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your professional name"
              />
            </div>
            <div>
              <Label htmlFor="role">Title / Role</Label>
              <Input
                id="role"
                value={profile.role}
                onChange={(e) => handleChange('role', e.target.value)}
                placeholder="e.g., Fashion Designer, Creative Director"
              />
            </div>
            <div>
              <Label htmlFor="experience">Experience Level</Label>
              <Select value={profile.experience} onValueChange={(value) => handleChange('experience', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="emerging">Emerging Designer</SelectItem>
                  <SelectItem value="established">Established Designer</SelectItem>
                  <SelectItem value="senior">Senior Designer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="background">Professional Background</Label>
            <Textarea
              id="background"
              value={profile.background}
              onChange={(e) => handleChange('background', e.target.value)}
              placeholder="Describe your journey in fashion..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="style">Design Style</Label>
            <Input
              id="style"
              value={profile.style}
              onChange={(e) => handleChange('style', e.target.value)}
              placeholder="e.g., Minimalist, Avant-garde, Sustainable"
            />
          </div>

          <div>
            <Label htmlFor="inspirations">Key Inspirations</Label>
            <Textarea
              id="inspirations"
              value={profile.inspirations}
              onChange={(e) => handleChange('inspirations', e.target.value)}
              placeholder="What drives your creative vision?"
              rows={2}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="education">Education</Label>
              <Input
                id="education"
                value={profile.education}
                onChange={(e) => handleChange('education', e.target.value)}
                placeholder="Schools, apprenticeships, notable programs"
              />
            </div>
            <div>
              <Label htmlFor="specialties">Specialties</Label>
              <Input
                id="specialties"
                value={profile.specialties}
                onChange={(e) => handleChange('specialties', e.target.value)}
                placeholder="e.g., couture tailoring, sustainable materials"
              />
            </div>
          </div>

          <div className="pt-2 border-t" />
          <div className="space-y-3">
            <div className="font-medium">Business Details</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={2}
                  value={profile.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Studio or business address"
                />
              </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={profile.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://yourbrand.com"
              />
              {suggestedWebsite && (
                <div className="text-xs text-muted-foreground mt-1">
                  Suggestion: <button type="button" className="underline" onClick={() => handleChange('website', suggestedWebsite)}>{suggestedWebsite}</button>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@yourbrand.com"
              />
              {!emailValid && (
                <div className="text-xs text-red-600 mt-1">{emailError || 'Invalid email format.'}</div>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={profile.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  placeholder="@yourbrand"
                />
              </div>
              <div>
                <Label htmlFor="twitter">Twitter / X</Label>
                <Input
                  id="twitter"
                  value={profile.twitter}
                  onChange={(e) => handleChange('twitter', e.target.value)}
                  placeholder="@yourbrand"
                />
              </div>
              <div>
                <Label htmlFor="tiktok">TikTok</Label>
                <Input
                  id="tiktok"
                  value={profile.tiktok}
                  onChange={(e) => handleChange('tiktok', e.target.value)}
                  placeholder="@yourbrand"
                />
              </div>
              <div>
                <Label htmlFor="logo">Logo</Label>
                <input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e)=> {
                    const f = e.target.files?.[0]; if (!f) return;
                    const r = new FileReader(); r.onload = ()=> handleChange('logo', (r.result as string) || ''); r.readAsDataURL(f);
                  }}
                />
                {profile.logo && (
                  <div className="mt-2"><img src={profile.logo} alt="Logo" style={{ maxWidth: 160, maxHeight: 80, border: '1px solid #eee', borderRadius: 6 }} /></div>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full">
            Generate Professional Profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default DesignerProfileForm;

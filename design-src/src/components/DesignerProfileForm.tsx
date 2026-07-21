import React, { useState } from 'react';
import { getUser } from '@/utils/auth';
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
  const workspaceDefaults = getUser()?.businessDefaults;
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

  React.useEffect(() => {
    if (initialProfile) {
      setProfile(prev => ({
        ...prev,
        ...initialProfile,
      } as DesignerProfile));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialProfile || {})]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(profile);
  };

  const handleChange = (field: keyof DesignerProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
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
            <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              Business identity, contact details, logo, currency, and units are inherited from Workspace Settings.
              <a className="ml-1 underline font-medium text-foreground" href="../workspace/#settings">Manage workspace settings</a>
              <div className="mt-3 grid gap-1 text-xs">
                <span>{workspaceDefaults?.email || 'No business email set'}</span>
                <span>{workspaceDefaults?.phone || 'No business phone set'}</span>
                <span>{workspaceDefaults?.address || 'No business address set'}</span>
              </div>
            </div>
            <div className="font-medium">Designer social profiles</div>
            <div className="grid md:grid-cols-2 gap-4">
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

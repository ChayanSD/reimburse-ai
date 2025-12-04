import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { table } = await request.json();

    if (!table) {
      return NextResponse.json(
        { error: 'Table name is required' }, 
        { status: 400 }
      );
    }

    // Define table configurations
    const tableConfigs = {
      receipts: {
        model: prisma.receipt,
        userSpecific: true,
        fields: ['id', 'userId', 'fileUrl', 'merchantName', 'receiptDate', 'amount', 'category', 'currency', 'note', 'needsReview', 'isDuplicate', 'confidence', 'createdAt', 'updatedAt']
      },
      reports: {
        model: prisma.report,
        userSpecific: true,
        fields: ['id', 'userId', 'periodStart', 'periodEnd', 'title', 'totalAmount', 'receiptCount', 'pdfUrl', 'csvUrl', 'createdAt']
      },
      company_settings: {
        model: prisma.companySettings,
        userSpecific: true,
        fields: ['id', 'userId', 'companyName', 'addressLine1', 'addressLine2', 'city', 'state', 'zipCode', 'country', 'approverName', 'approverEmail', 'department', 'costCenter', 'notes', 'isDefault', 'createdAt', 'updatedAt']
      },
      audit_log: {
        model: prisma.auditLog,
        userSpecific: true,
        fields: ['id', 'userId', 'eventType', 'eventData', 'ipAddress', 'userAgent', 'createdAt']
      },
      auth_users: {
        model: prisma.authUser,
        userSpecific: false,
        fields: ['id', 'email', 'firstName', 'lastName', 'role', 'subscriptionStatus', 'subscriptionTier', 'stripeCustomerId', 'stripeSubscriptionId', 'trialStart', 'trialEnd', 'referralCode', 'earlyAdopter', 'createdAt', 'updatedAt']
      }
    };

    const config = tableConfigs[table as keyof typeof tableConfigs];

    if (!config) {
      return NextResponse.json(
        { error: 'Invalid table name' }, 
        { status: 400 }
      );
    }

    // Build where clause based on user specificity and user role
    const whereClause: Record<string, unknown> = {};
    
    if (config.userSpecific && user.role !== 'ADMIN') {
      whereClause.userId = user.id;
    }

    // Execute query based on table type
    let data: Record<string, unknown>[] = [];
    
    switch (table) {
      case 'receipts':
        data = await prisma.receipt.findMany({
          where: whereClause,
          select: config.fields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
          }, {} as Record<string, boolean>),
          orderBy: { id: 'desc' },
          take: 100
        });
        break;
      case 'reports':
        data = await prisma.report.findMany({
          where: whereClause,
          select: config.fields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
          }, {} as Record<string, boolean>),
          orderBy: { id: 'desc' },
          take: 100
        });
        break;
      case 'company_settings':
        data = await prisma.companySettings.findMany({
          where: whereClause,
          select: config.fields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
          }, {} as Record<string, boolean>),
          orderBy: { id: 'desc' },
          take: 100
        });
        break;
      case 'audit_log':
        data = await prisma.auditLog.findMany({
          where: whereClause,
          select: config.fields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
          }, {} as Record<string, boolean>),
          orderBy: { id: 'desc' },
          take: 100
        });
        break;
      case 'auth_users':
        data = await prisma.authUser.findMany({
          where: whereClause,
          select: config.fields.reduce((acc, field) => {
            acc[field] = true;
            return acc;
          }, {} as Record<string, boolean>),
          orderBy: { id: 'desc' },
          take: 100
        });
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid table name' }, 
          { status: 400 }
        );
    }

    // Transform data for display (convert Decimal to string, format dates)
    const transformedData = data.map((row: Record<string, unknown>) => {
      const transformed: Record<string, unknown> = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
          transformed[key] = value.toString();
        } else if (value && typeof value === 'object' && value instanceof Date) {
          transformed[key] = value.toISOString();
        } else {
          transformed[key] = value;
        }
      });
      return transformed;
    });

    return NextResponse.json({
      success: true,
      rows: transformedData,
      count: transformedData.length
    });

  } catch (error) {
    console.error('Database view error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}